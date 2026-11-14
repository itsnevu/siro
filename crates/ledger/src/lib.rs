//! Durable append-only journal and RFC 8785 decision commitments.
#[cfg(test)]
mod fault_tests;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{File, OpenOptions},
    io::{BufRead, BufReader, Seek, SeekFrom, Write},
    path::Path,
};
pub const GENESIS: &str = "0000000000000000000000000000000000000000000000000000000000000000";
pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
pub fn canonical<T: Serialize>(value: &T) -> Result<Vec<u8>> {
    Ok(serde_jcs::to_vec(value)?)
}
pub fn hash<T: Serialize>(value: &T) -> Result<String> {
    Ok(hex::encode(Sha256::digest(canonical(value)?)))
}
pub fn is_hash(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
pub fn millis(s: &str) -> Result<i64> {
    Ok(chrono::DateTime::parse_from_rfc3339(s)?.timestamp_millis())
}
pub fn timestamp(ms: i64) -> Result<String> {
    Ok(chrono::DateTime::from_timestamp_millis(ms)
        .ok_or("timestamp overflow")?
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rationale {
    pub rule_id: String,
    pub threshold: f64,
    pub observed: f64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Veto {
    pub code: String,
    pub observed: f64,
    pub limit: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Decision {
    pub decision_id: String,
    pub agent_id: String,
    pub agent_version: u32,
    pub parent_version: Option<u32>,
    pub strategy_hash: String,
    pub tick_ts: String,
    pub commit_ts: String,
    pub reveal_ts: String,
    pub prev_hash: String,
    pub commit_hash: String,
    pub universe_snapshot_hash: String,
    pub features: BTreeMap<String, f64>,
    pub regime_label: String,
    pub action: String,
    pub target_weight: f64,
    pub notional_usd: f64,
    pub predicted_prob_up: f64,
    pub horizon_h: u32,
    pub expected_edge_bps: f64,
    pub cost_estimate_bps: f64,
    pub rationale_struct: Rationale,
    pub rationale_text: String,
    pub risk_veto: Vec<Veto>,
    pub risk_adjusted: bool,
    pub confidence: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supersedes: Option<String>,
}
impl Decision {
    pub fn computed_hash(&self) -> Result<String> {
        let mut v = serde_json::to_value(self)?;
        v.as_object_mut()
            .ok_or("decision must be object")?
            .remove("commit_hash");
        hash(&v)
    }
    pub fn seal(&mut self) -> Result<()> {
        self.commit_hash = self.computed_hash()?;
        self.validate()
    }
    pub fn validate(&self) -> Result<()> {
        if self.supersedes.as_ref() == Some(&self.decision_id) {
            return Err("a decision cannot supersede itself".into());
        }
        let tick = millis(&self.tick_ts)?;
        let commit = millis(&self.commit_ts)?;
        let reveal = millis(&self.reveal_ts)?;
        let id = self.decision_id.as_bytes();
        if id.len() != 36
            || id[14] != b'7'
            || !b"89ab".contains(&id[19])
            || self.decision_id.chars().enumerate().any(|(i, c)| {
                if [8, 13, 18, 23].contains(&i) {
                    c != '-'
                } else {
                    !c.is_ascii_hexdigit() || c.is_ascii_uppercase()
                }
            })
        {
            return Err("invalid UUIDv7".into());
        }
        let uuid_time = i64::from_str_radix(&self.decision_id[..13].replace('-', ""), 16)?;
        if uuid_time != tick
            || tick < 0
            || tick % 3_600_000 != 0
            || commit < tick
            || commit >= tick.checked_add(5000).ok_or("time overflow")?
            || reveal < tick.checked_add(3_600_000).ok_or("time overflow")?
        {
            return Err("invalid commitment timing".into());
        }
        if ![
            &self.strategy_hash,
            &self.prev_hash,
            &self.commit_hash,
            &self.universe_snapshot_hash,
        ]
        .iter()
        .all(|s| is_hash(s))
            || self.computed_hash()? != self.commit_hash
        {
            return Err("decision hash mismatch".into());
        }
        if self.agent_id.trim().is_empty()
            || self.agent_version == 0
            || self
                .parent_version
                .is_some_and(|v| v == 0 || v >= self.agent_version)
            || self.horizon_h == 0
        {
            return Err("invalid agent lineage or horizon".into());
        }
        if !["trending_up", "chop", "risk_off", "vol_shock"].contains(&self.regime_label.as_str())
            || !["buy", "sell", "hold", "reduce"].contains(&self.action.as_str())
        {
            return Err("unknown action or regime".into());
        }
        if !self.target_weight.is_finite()
            || self.target_weight.abs() > 1.
            || !self.notional_usd.is_finite()
            || self.notional_usd < 0.
            || !self.cost_estimate_bps.is_finite()
            || self.cost_estimate_bps < 0.
            || !self.expected_edge_bps.is_finite()
            || ![self.confidence, self.predicted_prob_up]
                .iter()
                .all(|p| p.is_finite() && (0. ..=1.).contains(p))
        {
            return Err("invalid financial decision values".into());
        }
        if self.features.is_empty()
            || self.features.values().any(|x| !x.is_finite())
            || !["z_48h", "rsi_14", "atr_pct"]
                .iter()
                .all(|k| self.features.contains_key(*k))
            || !self.rationale_struct.threshold.is_finite()
            || !self.rationale_struct.observed.is_finite()
            || self.rationale_struct.rule_id.is_empty()
            || !self
                .features
                .keys()
                .any(|k| self.rationale_text.contains(k))
            || !self.rationale_text.chars().any(|c| c.is_ascii_digit())
        {
            return Err("numeric rationale and feature citations required".into());
        }
        let rsi = self.features.get("rsi_14").ok_or("RSI missing")?;
        let atr = self.features.get("atr_pct").ok_or("ATR missing")?;
        if !(0. ..=100.).contains(rsi) || *atr < 0. {
            return Err("feature values violate decision schema".into());
        }
        if self
            .risk_veto
            .iter()
            .any(|v| v.code.is_empty() || !v.observed.is_finite() || !v.limit.is_finite())
        {
            return Err("invalid veto reason".into());
        }
        if ["buy", "sell"].contains(&self.action.as_str())
            && (self.expected_edge_bps <= self.cost_estimate_bps || !self.risk_veto.is_empty())
        {
            return Err("entry fails cost/risk gate".into());
        }
        Ok(())
    }
}
/// Deterministic UUIDv7; entropy derives from agent identity/version and timestamp.
pub fn decision_id(agent: &str, version: u32, tick: i64) -> Result<String> {
    if !(0..=0xffff_ffff_ffff).contains(&tick) {
        return Err("UUID timestamp out of range".into());
    }
    let h = hash(&(agent, version, tick))?;
    let t = format!("{tick:012x}");
    Ok(format!(
        "{}-{}-7{}-8{}-{}",
        &t[..8],
        &t[8..],
        &h[..3],
        &h[3..6],
        &h[6..18]
    ))
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Event {
    pub seq: u64,
    pub ts: i64,
    pub prev_hash: String,
    pub event_hash: String,
    pub kind: String,
    pub payload: Value,
}
impl Event {
    fn computed_hash(&self) -> Result<String> {
        let mut v = serde_json::to_value(self)?;
        v.as_object_mut()
            .ok_or("invalid event")?
            .remove("event_hash");
        hash(&v)
    }
}
pub fn read_events(path: &Path) -> Result<Vec<Event>> {
    if !path.exists() {
        return Ok(vec![]);
    }
    let mut previous = GENESIS.to_string();
    let mut previous_decision = GENESIS.to_string();
    let mut decision_ids = std::collections::BTreeSet::new();
    let mut events = Vec::new();
    let mut reader = BufReader::new(File::open(path)?);
    let mut line = Vec::new();
    loop {
        line.clear();
        let n = reader.read_until(b'\n', &mut line)?;
        if n == 0 {
            break;
        }
        if n > 4_000_000 || line.last() != Some(&b'\n') {
            return Err("oversized or torn journal record; operator recovery required".into());
        }
        let event: Event = serde_json::from_slice(&line)?;
        if event.seq != events.len() as u64
            || event.prev_hash != previous
            || event.computed_hash()? != event.event_hash
        {
            return Err("event chain verification failed".into());
        }
        previous = event.event_hash.clone();
        if event.kind == "decision" {
            let d: Decision = serde_json::from_value(event.payload.clone())?;
            d.validate()?;
            if d.prev_hash != previous_decision
                || !decision_ids.insert(d.decision_id.clone())
                || d.supersedes
                    .as_ref()
                    .is_some_and(|id| !decision_ids.contains(id))
            {
                return Err("decision lineage verification failed".into());
            }
            previous_decision = d.commit_hash;
        }
        events.push(event);
    }
    Ok(events)
}
trait DurableFile: Write + Send {
    fn sync_all(&self) -> std::io::Result<()>;
}
impl DurableFile for File {
    fn sync_all(&self) -> std::io::Result<()> {
        File::sync_all(self)
    }
}
pub struct Journal {
    file: Box<dyn DurableFile>,
    _lock: File,
    events: Vec<Event>,
    poisoned: bool,
}
impl Journal {
    pub fn open(path: &Path) -> Result<Self> {
        let lock = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path.with_extension("jsonl.lock"))?;
        fs2::FileExt::try_lock_exclusive(&lock)?;
        let mut file = OpenOptions::new()
            .read(true)
            .append(true)
            .create(true)
            .open(path)?;
        let events = read_events(path)?;
        file.seek(SeekFrom::End(0))?;
        Ok(Self {
            file: Box::new(file),
            _lock: lock,
            events,
            poisoned: false,
        })
    }
    pub fn events(&self) -> &[Event] {
        &self.events
    }
    pub fn tip(&self) -> &str {
        self.events
            .last()
            .map_or(GENESIS, |e| e.event_hash.as_str())
    }
    pub fn append<T: Serialize>(&mut self, ts: i64, kind: &str, payload: &T) -> Result<Event> {
        if self.poisoned {
            return Err("journal poisoned after failed durable append".into());
        }
        let mut event = Event {
            seq: self.events.len() as u64,
            ts,
            prev_hash: self.tip().into(),
            event_hash: String::new(),
            kind: kind.into(),
            payload: serde_json::to_value(payload)?,
        };
        event.event_hash = event.computed_hash()?;
        let mut bytes = canonical(&event)?;
        bytes.push(b'\n');
        if let Err(e) = self
            .file
            .write_all(&bytes)
            .and_then(|()| self.file.sync_all())
        {
            self.poisoned = true;
            return Err(e.into());
        }
        self.events.push(event.clone());
        Ok(event)
    }
    pub fn commit(&mut self, decision: &Decision) -> Result<Event> {
        decision.validate()?;
        let mut previous = GENESIS.to_string();
        let mut superseded = decision.supersedes.is_none();
        for e in &self.events {
            if e.kind == "decision" {
                let d: Decision = serde_json::from_value(e.payload.clone())?;
                if d.decision_id == decision.decision_id {
                    if d.commit_hash == decision.commit_hash {
                        return Ok(e.clone());
                    }
                    return Err("decision ID conflict".into());
                }
                if decision.supersedes.as_ref() == Some(&d.decision_id) {
                    superseded = true;
                }
                previous = d.commit_hash;
            }
        }
        if !superseded || decision.prev_hash != previous {
            return Err("decision predecessor or supersedes not found".into());
        }
        self.append(millis(&decision.commit_ts)?, "decision", decision)
    }
}
pub fn merkle_root(leaves: &[String]) -> Result<String> {
    if leaves.is_empty() {
        return Err("empty merkle tree".into());
    }
    let mut level: Vec<Vec<u8>> = leaves
        .iter()
        .map(|s| {
            if !is_hash(s) {
                return Err("invalid leaf".into());
            }
            Ok(hex::decode(s)?)
        })
        .collect::<Result<_>>()?;
    while level.len() > 1 {
        let mut next = Vec::new();
        for pair in level.chunks(2) {
            let mut h = Sha256::new();
            h.update(&pair[0]);
            h.update(pair.get(1).unwrap_or(&pair[0]));
            next.push(h.finalize().to_vec());
        }
        level = next;
    }
    Ok(hex::encode(&level[0]))
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofStep {
    pub sibling: String,
    pub left: bool,
}
pub fn merkle_proof(leaves: &[String], mut index: usize) -> Result<Vec<ProofStep>> {
    merkle_root(leaves)?;
    if index >= leaves.len() {
        return Err("leaf index out of bounds".into());
    }
    let mut level = leaves.to_vec();
    let mut proof = Vec::new();
    while level.len() > 1 {
        let sibling = if index.is_multiple_of(2) {
            level.get(index + 1).unwrap_or(&level[index])
        } else {
            &level[index - 1]
        };
        proof.push(ProofStep {
            sibling: sibling.clone(),
            left: index % 2 == 1,
        });
        level = level
            .chunks(2)
            .map(|p| merkle_root(&[p[0].clone(), p.get(1).unwrap_or(&p[0]).clone()]))
            .collect::<Result<_>>()?;
        index /= 2;
    }
    Ok(proof)
}
pub fn verify_proof(leaf: &str, proof: &[ProofStep], root: &str) -> Result<bool> {
    let mut current = leaf.to_string();
    for p in proof {
        current = if p.left {
            merkle_root(&[p.sibling.clone(), current])?
        } else {
            merkle_root(&[current, p.sibling.clone()])?
        };
    }
    Ok(current == root)
}
