pub async fn verify_lock(
    proof: &serde_json::Value,
    hash: &str,
    w: &crate::validation::Window,
) -> ledger::Result<bool> {
    use tokio::io::AsyncWriteExt;
    let root = std::env::var("SIRO_SERVICE_ROOT")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."));
    let mut child = tokio::process::Command::new("node")
        .arg(root.join("services/anchor/verify-lock.mjs"))
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;
    let mut stdin = child.stdin.take().ok_or("verifier stdin missing")?;
    stdin
        .write_all(&serde_json::to_vec(
            &serde_json::json!({"proof":proof,"hash":hash,"start":w.test_start,"end":w.test_end}),
        )?)
        .await?;
    drop(stdin);
    let output = tokio::time::timeout(std::time::Duration::from_secs(30), child.wait_with_output())
        .await??;
    if !output.status.success() {
        return Err("external OOS lock could not be verified against its chain".into());
    }
    let result: serde_json::Value = serde_json::from_slice(&output.stdout)?;
    Ok(result["verified"] == true && result["hash"] == hash)
}
