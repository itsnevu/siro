use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
pub struct RiskClient {
    child: tokio::process::Child,
    input: tokio::process::ChildStdin,
    output: BufReader<tokio::process::ChildStdout>,
}
impl RiskClient {
    pub fn start(program: &std::path::Path) -> ledger::Result<Self> {
        let mut child = tokio::process::Command::new(program)
            .arg("--stream")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::inherit())
            .kill_on_drop(true)
            .spawn()?;
        let input = child.stdin.take().ok_or("risk stdin missing")?;
        let output = BufReader::new(child.stdout.take().ok_or("risk stdout missing")?);
        Ok(Self {
            child,
            input,
            output,
        })
    }
    pub async fn evaluate(
        &mut self,
        r: &riskengine::Request,
    ) -> ledger::Result<riskengine::Permit> {
        let work = async {
            self.input.write_all(&ledger::canonical(r)?).await?;
            self.input.write_all(b"\n").await?;
            self.input.flush().await?;
            let mut line = String::new();
            if self.output.read_line(&mut line).await? == 0 || line.len() > 65536 {
                return Err("risk process terminated or returned oversized reply".into());
            }
            Ok(serde_json::from_str(&line)?)
        };
        match tokio::time::timeout(std::time::Duration::from_secs(2), work).await {
            Ok(result) => result,
            Err(_) => {
                self.child.start_kill()?;
                Err("risk timeout; execution denied".into())
            }
        }
    }
}
