use std::{
    io::{BufRead, Read, Write},
    path::Path,
};
fn main() -> ledger::Result<()> {
    let policy: riskengine::Policy =
        serde_json::from_reader(std::fs::File::open(std::env::var("SIRO_RISK_POLICY")?)?)?;
    let key = hex::decode(std::env::var("SIRO_RISK_MAC_KEY")?)?;
    if std::env::args().any(|a| a == "--stream") {
        let input = std::io::stdin();
        let mut input = input.lock();
        let output = std::io::stdout();
        let mut output = output.lock();
        loop {
            let mut line = String::new();
            if input.read_line(&mut line)? == 0 {
                break;
            }
            if line.len() > 65536 {
                return Err("risk request too large".into());
            }
            let request: riskengine::Request = serde_json::from_str(&line)?;
            let kill = Path::new(&std::env::var("SIRO_KILL_FILE")?).try_exists()?;
            let permit = riskengine::sign(riskengine::evaluate(&policy, &request, kill)?, &key)?;
            output.write_all(&ledger::canonical(&permit)?)?;
            output.write_all(b"\n")?;
            output.flush()?;
        }
        return Ok(());
    }
    let mut body = Vec::new();
    std::io::stdin().take(65537).read_to_end(&mut body)?;
    if body.len() > 65536 {
        return Err("risk request too large".into());
    }
    let request: riskengine::Request = serde_json::from_slice(&body)?;
    let kill = Path::new(&std::env::var("SIRO_KILL_FILE")?).try_exists()?;
    let permit = riskengine::sign(riskengine::evaluate(&policy, &request, kill)?, &key)?;
    std::io::stdout().write_all(&ledger::canonical(&permit)?)?;
    Ok(())
}
