use super::*;
struct FullDisk;
impl std::io::Write for FullDisk {
    fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
        Err(std::io::Error::new(
            std::io::ErrorKind::StorageFull,
            "disk full fault",
        ))
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
impl DurableFile for FullDisk {
    fn sync_all(&self) -> std::io::Result<()> {
        Err(std::io::Error::new(
            std::io::ErrorKind::StorageFull,
            "disk full fault",
        ))
    }
}
#[test]
fn disk_full_does_not_advance_journal_and_poison_blocks_retry() -> Result<()> {
    let path = std::env::temp_dir().join(format!(
        "siro-full-{}-{}.jsonl",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_nanos()
    ));
    let mut log = Journal::open(&path)?;
    log.append(0, "checkpoint", &serde_json::json!({"balance":100}))?;
    let tip = log.tip().to_owned();
    log.file = Box::new(FullDisk);
    assert!(log
        .append(
            1,
            "decision",
            &serde_json::json!({"should_not_commit":true})
        )
        .is_err());
    assert_eq!(log.tip(), tip);
    assert_eq!(log.events.len(), 1);
    assert!(log
        .append(2, "order", &serde_json::json!({"should_not_submit":true}))
        .is_err());
    drop(log);
    assert_eq!(read_events(&path)?.len(), 1);
    std::fs::remove_file(&path)?;
    std::fs::remove_file(path.with_extension("jsonl.lock"))?;
    Ok(())
}
