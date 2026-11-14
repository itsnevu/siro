use ledger::{Event, Result};
use std::path::Path;
/// A file serves one run; a directory serves multiple independently verified runs.
pub fn read(path: &Path) -> Result<Vec<Event>> {
    if path.is_file() {
        return ledger::read_events(path);
    }
    if !path.is_dir() {
        return Err("journal source is missing".into());
    }
    let mut paths = std::fs::read_dir(path)?
        .map(|e| e.map(|e| e.path()))
        .collect::<std::io::Result<Vec<_>>>()?;
    paths.sort();
    let mut result = vec![];
    for path in paths {
        if path.extension().is_some_and(|e| e == "jsonl") {
            result.extend(ledger::read_events(&path)?);
        }
    }
    result.sort_by_key(|e| (e.ts, e.seq));
    Ok(result)
}
