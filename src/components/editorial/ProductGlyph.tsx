const paths:Record<string,string>={
  Assets:"M4 20V12m8 8V4m8 16V8M2 22h20",
  Weights:"M12 3v17M5 7h14M5 7 2 14h6L5 7zm14 0-3 7h6l-3-7zM7 22h10",
  Schedule:"M5 5h14a2 2 0 012 2v13H3V7a2 2 0 012-2zm2-3v6m10-6v6M3 11h18m-13 4h2m4 0h2",
  "Rebalance Trigger":"M4 10a8 8 0 0113-6l3 3m0-5v5h-5M20 14a8 8 0 01-13 6l-3-3m0 5v-5h5",
  Conditions:"M4 5h5v5H4zM15 14h5v5h-5zM9 7h7v7M7 10v7h8",
  "Risk Limits":"M12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6l-8-4zm-4 10 3 3 5-6",
  "Exit Rules":"M10 3H4v18h6m3-14 5 5-5 5m-5-5h14",
};
export function ProductGlyph({name}:{name:string}){
  return <svg className="product-block-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={paths[name]??paths.Assets} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
