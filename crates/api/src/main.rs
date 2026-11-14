mod advisory;
mod publication;
mod source;
use axum::{
    extract::{
        ws::{Message, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use ledger::{Decision, Event, Result, GENESIS};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
type Shared = Arc<PathBuf>;
fn now() -> Result<i64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_millis()
        .try_into()?)
}
fn decisions(events: &[Event]) -> Result<Vec<Decision>> {
    events
        .iter()
        .filter(|e| e.kind == "decision")
        .map(|e| {
            let d: Decision = serde_json::from_value(e.payload.clone())?;
            d.validate()?;
            Ok(d)
        })
        .collect()
}
fn public_decision(d: &Decision, time: i64) -> Result<Value> {
    Ok(if time >= ledger::millis(&d.reveal_ts)? {
        json!({"status":"revealed","record":d,"prev_hash":d.prev_hash,"verification_url":format!("/verify/{}",d.decision_id)})
    } else {
        json!({"status":"committed","decision_id":d.decision_id,"commit_hash":d.commit_hash,"commit_ts":d.commit_ts,"reveal_ts":d.reveal_ts,"prev_hash":d.prev_hash,"verification_url":format!("/verify/{}",d.decision_id)})
    })
}
fn root_data(ds: &[Decision]) -> Result<Value> {
    let mut hours: BTreeMap<i64, Vec<String>> = BTreeMap::new();
    for d in ds {
        hours
            .entry(ledger::millis(&d.tick_ts)? / 3_600_000)
            .or_default()
            .push(d.commit_hash.clone());
    }
    let mut days: BTreeMap<i64, Vec<Value>> = BTreeMap::new();
    for (hour, leaves) in hours {
        let root = ledger::merkle_root(&leaves)?;
        days.entry(hour / 24)
            .or_default()
            .push(json!({"hour":hour,"root":root,"leaves":leaves}));
    }
    Ok(Value::Array(
        days.into_iter()
            .map(|(day, hours)| -> Result<Value> {
                let roots: Vec<String> = hours
                    .iter()
                    .filter_map(|h| h["root"].as_str().map(str::to_string))
                    .collect();
                Ok(json!({"day":day,"root":ledger::merkle_root(&roots)?,"hours":hours}))
            })
            .collect::<Result<Vec<_>>>()?,
    ))
}
fn envelope(events: &[Event], data: Value) -> Json<Value> {
    Json(
        json!({"prev_hash":events.last().map_or(GENESIS,|e|e.event_hash.as_str()),"verification_url":"/roots","data":data}),
    )
}
fn failure(e: impl std::fmt::Display) -> (StatusCode, Json<Value>) {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(json!({"error":e.to_string(),"prev_hash":GENESIS,"verification_url":"/roots"})),
    )
}
async fn agents(State(path): State<Shared>) -> impl IntoResponse {
    let result = (|| -> Result<_> {
        let events = source::read(&path)?;
        let mut latest = BTreeMap::new();
        for e in &events {
            if e.kind == "report" {
                let id = e.payload["agent_id"]
                    .as_str()
                    .ok_or("report lacks agent id")?;
                if !e.payload["metrics"]["gross_return"].is_number()
                    || !e.payload["metrics"]["net_return"].is_number()
                {
                    return Err("gross/net pair missing".into());
                }
                latest.insert(id.to_owned(), e.payload.clone());
            }
        }
        let advisory_events = if let Ok(path) = std::env::var("SIRO_ADVISORY_JOURNAL") {
            ledger::read_events(std::path::Path::new(&path))?
        } else {
            vec![]
        };
        for report in latest.values_mut() {
            advisory::attach(report, &events, &advisory_events)?;
        }
        Ok(envelope(
            &events,
            json!(latest.values().collect::<Vec<_>>()),
        ))
    })();
    result.map_err(failure)
}
#[derive(serde::Deserialize)]
struct Page {
    after: Option<usize>,
}
async fn list(State(path): State<Shared>, Query(page): Query<Page>) -> impl IntoResponse {
    let result = (|| -> Result<_> {
        let events = source::read(&path)?;
        let ds = decisions(&events)?;
        let time = now()?;
        let rows = ds
            .iter()
            .skip(page.after.unwrap_or(0))
            .take(100)
            .map(|d| public_decision(d, time))
            .collect::<Result<Vec<_>>>()?;
        Ok(envelope(
            &events,
            json!({"records":rows,"next":if page.after.unwrap_or(0).saturating_add(rows.len())<ds.len(){Some(page.after.unwrap_or(0).saturating_add(rows.len()))}else{None},"total":ds.len()}),
        ))
    })();
    result.map_err(failure)
}
async fn verify(State(path): State<Shared>, Path(id): Path<String>) -> impl IntoResponse {
    let result = (|| -> Result<_> {
        let events = source::read(&path)?;
        let ds = decisions(&events)?;
        let d = ds
            .iter()
            .find(|d| d.decision_id == id)
            .ok_or("decision not found")?;
        let hour = ledger::millis(&d.tick_ts)? / 3_600_000;
        let roots = root_data(&ds)?;
        let day = roots
            .as_array()
            .ok_or("invalid roots")?
            .iter()
            .find(|r| r["day"] == json!(hour / 24))
            .ok_or("day not found")?;
        let hours = day["hours"].as_array().ok_or("invalid hours")?;
        let hi = hours
            .iter()
            .position(|h| h["hour"] == json!(hour))
            .ok_or("hour not found")?;
        let leaves: Vec<String> = serde_json::from_value(hours[hi]["leaves"].clone())?;
        let li = leaves
            .iter()
            .position(|h| h == &d.commit_hash)
            .ok_or("leaf absent")?;
        let hourly_roots: Vec<String> = hours
            .iter()
            .map(|h| h["root"].as_str().ok_or("root absent").map(str::to_owned))
            .collect::<std::result::Result<_, _>>()?;
        let anchor_events = if let Ok(p) = std::env::var("SIRO_ANCHOR_JOURNAL") {
            ledger::read_events(std::path::Path::new(&p))?
        } else {
            vec![]
        };
        let anchor = anchor_events
            .iter()
            .rev()
            .find(|e| {
                e.kind == "anchor_confirmed"
                    && e.payload["day"] == day["day"]
                    && e.payload["root"] == day["root"]
            })
            .map(|e| e.payload.clone());
        let publication = publication::verdict(d, &anchor_events, publication::max_lag_ms()?)?;
        Ok(envelope(
            &events,
            json!({"chain_integrity":true,"decision":public_decision(d,now()?)?,"hour_root":hours[hi]["root"],"daily_root":day["root"],"day":day["day"],"decision_proof":ledger::merkle_proof(&leaves,li)?,"hour_proof":ledger::merkle_proof(&hourly_roots,hi)?,"anchor":anchor,"publication_proven":publication["proven"],"publication":publication}),
        ))
    })();
    result.map_err(failure)
}
async fn roots(State(path): State<Shared>) -> impl IntoResponse {
    let result = (|| -> Result<_> {
        let events = source::read(&path)?;
        Ok(envelope(&events, root_data(&decisions(&events)?)?))
    })();
    result.map_err(failure)
}
async fn ws(State(path): State<Shared>, upgrade: WebSocketUpgrade) -> impl IntoResponse {
    upgrade.on_upgrade(move |mut socket|async move {let mut seen:BTreeMap<String,bool>=BTreeMap::new();let mut timer=tokio::time::interval(std::time::Duration::from_millis(250));
  loop {tokio::select!{_ = timer.tick()=>{
   let rows=(||->Result<Vec<Value>>{let events=source::read(&path)?;let time=now()?;let mut rows=Vec::new();for d in decisions(&events)? {let revealed=time>=ledger::millis(&d.reveal_ts)?;if seen.get(&d.decision_id)!=Some(&revealed){rows.push(public_decision(&d,time)?);seen.insert(d.decision_id.clone(),revealed);}}Ok(rows)})();
   match rows {Ok(rows)=>{for row in rows {if socket.send(Message::Text(row.to_string().into())).await.is_err(){return;}}},Err(e)=>{let _=socket.send(Message::Text(json!({"error":e.to_string(),"prev_hash":GENESIS,"verification_url":"/roots"}).to_string().into())).await;return;}}
  },incoming=socket.recv()=>{if incoming.is_none()||incoming.is_some_and(|m|m.is_err()||matches!(m,Ok(Message::Close(_)))){return;}}}
  }
 })
}
#[tokio::main]
async fn main() -> Result<()> {
    let path = PathBuf::from(std::env::var("SIRO_JOURNAL")?);
    if !path.is_file() && !path.is_dir() {
        return Err("SIRO_JOURNAL must point to an existing validated journal".into());
    }
    source::read(&path)?;
    let bind = std::env::var("SIRO_API_BIND").unwrap_or_else(|_| "127.0.0.1:4010".into());
    let app = Router::new()
        .route("/agents", get(agents))
        .route("/decisions", get(list))
        .route("/decisions/{id}", get(verify))
        .route("/verify/{id}", get(verify))
        .route("/roots", get(roots))
        .route("/ws", get(ws))
        .with_state(Arc::new(path));
    axum::serve(tokio::net::TcpListener::bind(bind).await?, app).await?;
    Ok(())
}
