use std::{cell::RefCell, path::PathBuf};
use tickstore::{Bar, MemoryStore, ParquetStore, TickStore, HOUR_MS as H};
fn fixture() -> Vec<Bar> {
    (0..240)
        .map(|i| {
            let p = 100. + i as f64 * 0.1 + (i as f64 * 0.3).sin();
            Bar {
                asset: "TEST".into(),
                open_ts: i * H,
                close_ts: (i + 1) * H,
                open: p,
                high: p + 2.,
                low: p - 2.,
                close: p + 0.5,
                volume: 1000.,
            }
        })
        .collect()
}
fn bytes(records: &[replay::FeatureRecord], t: i64) -> Result<Vec<u8>, serde_json::Error> {
    serde_json::to_vec(
        &records
            .iter()
            .filter(|r| r.tick_ts <= t)
            .collect::<Vec<_>>(),
    )
}
#[test]
fn no_future_leak() -> Result<(), Box<dyn std::error::Error>> {
    let original = fixture();
    let base = replay::run(
        &MemoryStore::new(original.clone())?,
        "TEST",
        48 * H,
        240 * H,
    )?;
    // Explicit seed; unique pseudo-random cutoffs. RNG never enters features or fills.
    let mut seed = 0x51_20_26_u64;
    let mut cutoffs = std::collections::BTreeSet::new();
    while cutoffs.len() < 50 {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        cutoffs.insert((48 + (seed >> 32) % 190) as i64 * H);
    }
    for t in cutoffs {
        let mut corrupted = original.clone();
        for b in &mut corrupted {
            if b.close_ts > t {
                seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
                let p = 10. + (seed >> 32) as f64 / 100.;
                b.open = p;
                b.close = p;
                b.low = p / 2.;
                b.high = p * 2.;
                b.volume = p;
            }
        }
        let other = replay::run(&MemoryStore::new(corrupted)?, "TEST", 48 * H, 240 * H)?;
        assert_eq!(bytes(&base, t)?, bytes(&other, t)?, "future leakage at {t}");
    }
    Ok(())
}
struct Audited {
    inner: MemoryStore,
    requests: RefCell<Vec<(i64, i64)>>,
}
impl TickStore for Audited {
    fn query(&self, asset: &str, from: i64, to: i64) -> tickstore::Result<Vec<Bar>> {
        self.requests.borrow_mut().push((from, to));
        self.inner.query(asset, from, to)
    }
}
#[test]
fn declared_lookback_and_closed_boundary() -> Result<(), Box<dyn std::error::Error>> {
    let store = Audited {
        inner: MemoryStore::new(fixture())?,
        requests: RefCell::new(vec![]),
    };
    features::compute(&store, "TEST", 100 * H)?;
    assert_eq!(*store.requests.borrow(), vec![(53 * H, 100 * H)]);
    assert!(features::DECLARATIONS
        .iter()
        .all(|(_, n)| *n <= features::MAX_LOOKBACK));
    let records = replay::run(&store, "TEST", 100 * H, 100 * H)?;
    assert_eq!(records[0].earliest_execution_open_ts, 100 * H);
    let next = store.inner.query("TEST", 101 * H, 101 * H)?;
    assert_eq!(next[0].open_ts, records[0].earliest_execution_open_ts);
    Ok(())
}
#[test]
fn rejects_bad_data_and_gaps() -> Result<(), Box<dyn std::error::Error>> {
    let mut bars = fixture();
    bars.push(bars[0].clone());
    assert!(MemoryStore::new(bars).is_err());
    let mut bars = fixture();
    bars[0].close = f64::NAN;
    assert!(MemoryStore::new(bars).is_err());
    let mut bars = fixture();
    bars.remove(70);
    assert!(features::compute(&MemoryStore::new(bars)?, "TEST", 100 * H).is_err());
    assert!(features::compute(&MemoryStore::new(fixture())?, "TEST", 47 * H).is_err());
    Ok(())
}
#[test]
fn flat_and_rising_features() -> Result<(), Box<dyn std::error::Error>> {
    let mut bars = fixture();
    for b in &mut bars {
        b.open = 100.;
        b.close = 100.;
        b.high = 100.;
        b.low = 100.;
    }
    let f = features::compute(&MemoryStore::new(bars.clone())?, "TEST", 100 * H)?;
    assert_eq!((f.z_48h, f.rsi_14, f.atr_pct), (0., 50., 0.));
    for (i, b) in bars.iter_mut().enumerate() {
        let p = 100. + i as f64;
        b.open = p;
        b.close = p;
        b.high = p + 1.;
        b.low = p - 1.;
    }
    let f = features::compute(&MemoryStore::new(bars)?, "TEST", 100 * H)?;
    assert_eq!(f.rsi_14, 100.);
    assert!((f.atr_pct - 200. / 199.).abs() < 1e-12);
    assert!((f.z_48h - 23.5_f64 / (2303_f64 / 12.).sqrt()).abs() < 1e-12);
    Ok(())
}
#[test]
fn parquet_roundtrip_and_replay() -> Result<(), Box<dyn std::error::Error>> {
    let path: PathBuf =
        std::env::temp_dir().join(format!("siro-phase1-{}.parquet", std::process::id()));
    let bars = fixture();
    tickstore::write_parquet(&path, bars.clone())?;
    let result = (|| -> Result<(), Box<dyn std::error::Error>> {
        let disk = ParquetStore::open(&path)?;
        assert_eq!(
            disk.query("TEST", 50 * H, 100 * H)?,
            MemoryStore::new(bars)?.query("TEST", 50 * H, 100 * H)?
        );
        assert_eq!(replay::run(&disk, "TEST", 48 * H, 240 * H)?.len(), 193);
        assert!(disk.query("MISSING", 0, 240 * H)?.is_empty());
        assert!(disk.query("TEST", H, 0).is_err());
        assert!(tickstore::write_parquet(&path, fixture()).is_err());
        Ok(())
    })();
    std::fs::remove_file(path)?;
    result
}
struct Leaky;
impl TickStore for Leaky {
    fn query(&self, _: &str, _: i64, _: i64) -> tickstore::Result<Vec<Bar>> {
        Ok(fixture()[53..101].to_vec())
    }
}
#[test]
fn rejects_store_returning_future_bars() {
    assert!(features::compute(&Leaky, "TEST", 100 * H).is_err());
}

#[test]
fn range_query_isolates_assets_and_includes_both_endpoints(
) -> Result<(), Box<dyn std::error::Error>> {
    let mut bars = fixture();
    let mut second = fixture();
    for bar in &mut second {
        bar.asset = "ZZZ".into();
    }
    bars.extend(second);
    bars.reverse();
    let store = MemoryStore::new(bars)?;
    for asset in ["TEST", "ZZZ"] {
        let result = store.query(asset, 50 * H, 55 * H)?;
        assert_eq!(result.len(), 6);
        assert!(result.iter().all(|b| b.asset == asset));
        assert_eq!(result[0].close_ts, 50 * H);
        assert_eq!(result[5].close_ts, 55 * H);
    }
    for asset in ["AAA", "TTT", "ZZZZ"] {
        assert!(store.query(asset, 0, 240 * H)?.is_empty());
    }
    Ok(())
}
