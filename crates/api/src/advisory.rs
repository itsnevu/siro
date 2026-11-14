use ledger::{Event, Result};
use serde_json::{json, Value};
pub fn attach(report: &mut Value, events: &[Event], records: &[Event]) -> Result<()> {
    let id = report["agent_id"].as_str().ok_or("agent ID missing")?;
    let decisions: Vec<_> = events
        .iter()
        .filter(|e| e.kind == "decision" && e.payload["agent_id"] == id)
        .collect();
    if decisions.is_empty() {
        return Ok(());
    }
    let mut total = 0.;
    for decision in decisions {
        let Some(advisory) = records.iter().find(|e| {
            e.kind == "advisory" && e.payload["decision_id"] == decision.payload["decision_id"]
        }) else {
            return Ok(());
        };
        if advisory.payload["contemporaneous"] != true {
            return Ok(());
        }
        let Some(cost) = advisory.payload["token_cost_usd"]
            .as_f64()
            .filter(|c| c.is_finite() && *c >= 0.)
        else {
            return Ok(());
        };
        total += cost;
    }
    let capital = report["capital_usd"]
        .as_f64()
        .filter(|v| *v > 0.)
        .ok_or("capital missing")?;
    let gross = report["metrics"]["gross_return"]
        .as_f64()
        .ok_or("gross return missing")?;
    let net = report["metrics"]["net_return"]
        .as_f64()
        .ok_or("net return missing")?;
    report["advisory_comparison"] = json!({"gross_return":gross,"net_return":net-total/capital,"without_llm_gross_return":gross,"without_llm_net_return":net,"token_cost_usd":total,"method":"identical deterministic orders; measured advisory token costs only"});
    Ok(())
}
