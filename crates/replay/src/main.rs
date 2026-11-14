use std::{error::Error, path::Path};
use tickstore::ParquetStore;
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("batch") if args.len()==3=>{
            let jobs:Vec<replay::batch::Run>=serde_json::from_reader(std::fs::File::open(&args[2])?)?;
            let report=replay::batch::run(jobs).await?;println!("{}",serde_json::to_string_pretty(&report)?);
            if report["failures"].as_array().is_some_and(|a|!a.is_empty()){return Err("one or more batch runs failed; inspect the report".into());}
        }
        Some("calibrate") if args.len()==5=>{
            let mut samples:Vec<costmodel::calibration::FillSample>=serde_json::from_reader(std::fs::File::open(&args[2])?)?;
            let as_of:i64=args[4].parse()?;samples.retain(|s|s.asset==args[3]&&s.available_ts<as_of);let calibration=costmodel::calibration::calibrate(&args[3],&samples,as_of)?;
            println!("{}",serde_json::to_string_pretty(&serde_json::json!({"calibration_id":ledger::hash(&(&calibration,&samples))?,"calibration":calibration}))?);
        }
        Some("study") if args.len() == 3 => {
            let study: replay::study::Study = serde_json::from_reader(std::fs::File::open(&args[2])?)?;
            println!("{}", serde_json::to_string_pretty(&replay::study::run(&study).await?)?);
        }
        Some("portfolio") if args.len() == 3 => {
            let config: replay::runtime::PortfolioConfig = serde_json::from_reader(std::fs::File::open(&args[2])?)?;
            println!("{}", serde_json::to_string_pretty(&replay::runtime::run_portfolio(&config).await?)?);
        }
        Some("run") if args.len() == 3 => {
            let config: replay::runtime::Config = serde_json::from_reader(std::fs::File::open(&args[2])?)?;
            println!("{}", serde_json::to_string_pretty(&replay::runtime::run(&config).await?)?);
        }
        Some("ingest") if args.len() == 4 => {
            use std::io::BufRead;
            let mut bars = Vec::new();
            for line in std::io::BufReader::new(std::fs::File::open(&args[2])?).lines() {
                let line = line?;
                if line.len() > 65536 { return Err("bar row too large".into()); }
                bars.push(serde_json::from_str::<tickstore::Bar>(&line)?);
            }
            tickstore::write_parquet(Path::new(&args[3]), bars)?;
            ParquetStore::open(Path::new(&args[3]))?;
        }
        Some("windows") if args.len() == 5 => {
            println!("{}", serde_json::to_string_pretty(&replay::validation::windows(args[2].parse()?, args[3].parse()?, args[4].parse()?)?)?);
        }
        Some("features") if args.len() == 7 => {
            let store = ParquetStore::open(Path::new(&args[2]))?;
            if args[6] != features::VERSION {
                return Err(format!("explicit feature version required: {}",features::VERSION).into());
            }
            for record in replay::run(&store, &args[3], args[4].parse()?, args[5].parse()?)? {
                println!("{}", serde_json::to_string(&record)?);
            }
        }
        _ => {
            return Err(
                format!("usage: replay run CONFIG.json | portfolio PORTFOLIO.json | study STUDY.json | batch RUNS.json | calibrate FILLS.json ASSET AS_OF_MS | ingest BARS.jsonl NEW.parquet | windows FROM_MS THROUGH_MS TRAIN_MONTHS | features DATA.parquet ASSET FROM_MS THROUGH_MS {}",features::VERSION).into(),
            )
        }
    }
    Ok(())
}
