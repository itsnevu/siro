// 1200×480 social banner: "Write the plan before the agent moves." Chart draws in, then holds.
// Numbers are illustrative and labelled so on the card.
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F} from './theme';
import {Logo, enter, clamp} from './components/Siro';

export const PB_W = 1200, PB_H = 480, PB_DUR = 150;

// Deterministic series (seeded), shaped like the reference: dip, climb, plateau, late drop.
const SERIES = (() => {
  let s = 7, v = 0;
  const out: number[] = [];
  for (let i = 0; i < 90; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 1.6;
    const drift = i < 6 ? -1.2 : i < 34 ? 0.55 : i < 40 ? 1.6 : i < 80 ? 0.12 : -0.9;
    v += drift + noise;
    out.push(v);
  }
  return out;
})();

const TICKERS = [
  {t: 'AAPL', c: '#1B1620'}, {t: 'MSFT', c: '#7566B5'}, {t: 'NVDA', c: '#5E9C6E'},
  {t: 'AMZN', c: '#E3A06B'}, {t: 'GOOGL', c: '#D07A9A'},
];

const Chart = ({p}: {p: number}) => {
  const w = 424, h = 118, min = Math.min(...SERIES), max = Math.max(...SERIES);
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - ((v - min) / (max - min)) * (h - 16) - 8]);
  const n = Math.max(2, Math.round(p * pts.length));
  const shown = pts.slice(0, n);
  const line = shown.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${line}L${shown[n - 1][0]},${h}L0,${h}Z`;
  const base = pts[0][1];
  const [hx, hy] = shown[n - 1];
  return (
    <svg width={w} height={h} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="pb-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A597FF" stopOpacity=".32" />
          <stop offset="1" stopColor="#EEB2CB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pb-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7566B5" /><stop offset="1" stopColor="#C46F93" />
        </linearGradient>
      </defs>
      <line x1={0} x2={w} y1={base} y2={base} stroke="rgba(27,22,32,.35)" strokeDasharray="3 4" />
      <path d={area} fill="url(#pb-fill)" />
      <path d={line} fill="none" stroke="url(#pb-line)" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={hx} cy={hy} r={4} fill="#7566B5" stroke="#fff" strokeWidth={2} />
    </svg>
  );
};

const Stat = ({label, value, tone}: {label: string; value: string; tone?: string}) => (
  <div style={{flex: 1, background: 'rgba(165,151,255,.10)', border: '1px solid rgba(117,102,181,.14)', borderRadius: 10, padding: '9px 12px'}}>
    <div style={{fontSize: 11.5, color: 'rgba(27,22,32,.6)'}}>{label}</div>
    <div style={{fontSize: 17, fontWeight: 600, color: tone ?? C.ink, marginTop: 2}}>{value}</div>
  </div>
);

const Check = ({children}: {children: string}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
    <span style={{width: 15, height: 15, borderRadius: '50%', background: C.ink, display: 'grid', placeItems: 'center'}}>
      <svg width="9" height="9" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" stroke="#F4F2EE" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
    </span>
    {children}
  </span>
);

export const PlanBanner = () => {
  const f = useCurrentFrame();
  const a = enter(f, 0), b = enter(f, 8), c = enter(f, 16), card = enter(f, 10, 30);
  const draw = interpolate(f, [28, 108], [0, 1], clamp);
  const pulse = 0.5 + 0.5 * Math.sin((f / 30) * Math.PI);
  const rise = (k: number) => ({opacity: k, transform: `translateY(${(1 - k) * 18}px)`});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(110deg,#F4F2EE 0%,#EFE9E1 55%,#E6DCD0 100%)', fontFamily: F.sans, color: C.ink, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 620, height: 620, right: -140, bottom: -330, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.55),rgba(238,178,203,.28) 45%,transparent 70%)', filter: 'blur(30px)'}} />
      <div style={{position: 'absolute', width: 520, height: 520, left: -200, top: -300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(243,205,176,.6),transparent 68%)', filter: 'blur(40px)'}} />

      <div style={{position: 'absolute', left: 70, top: 118}}>
        <div style={{...rise(a), display: 'inline-flex', alignItems: 'center', gap: 9, background: '#FBFAF7', border: '1px solid rgba(27,22,32,.08)', borderRadius: 999, padding: '6px 14px 6px 7px', fontSize: 14.5, fontWeight: 500, boxShadow: '0 4px 14px rgba(27,22,32,.06)'}}>
          <span style={{width: 24, height: 24, borderRadius: '50%', background: C.bg, display: 'grid', placeItems: 'center'}}><Logo size={15} /></span>
          <span style={{width: 7, height: 7, borderRadius: '50%', background: '#5E9C6E', boxShadow: `0 0 0 ${2 + pulse * 3}px rgba(94,156,110,.22)`}} />
          Mainnet · Markets open Monday 9:30 ET
        </div>
        <div style={{...rise(b), fontFamily: F.display, fontSize: 60, lineHeight: 1.04, letterSpacing: -2.6, marginTop: 22}}>
          Set the rules<br />
          <span style={{fontFamily: F.italic, fontStyle: 'italic', letterSpacing: -1}}>before the agent moves.</span>
        </div>
        <div style={{...rise(c), fontSize: 17.5, lineHeight: 1.5, color: 'rgba(27,22,32,.7)', marginTop: 20, width: 470}}>
          Backtest on real on-chain prices, paper trade it, and check every agent decision on chain. Your vault, your limits.
        </div>
      </div>

      <div style={{position: 'absolute', right: 60, top: 40, width: 480, opacity: card, transform: `translateY(${(1 - card) * 26}px) scale(${0.97 + card * 0.03})`, background: 'rgba(251,250,247,.92)', border: '5px solid rgba(255,255,255,.75)', borderRadius: 18, padding: '18px 22px', boxShadow: '0 30px 60px rgba(27,22,32,.14)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 21, fontWeight: 600, letterSpacing: -0.4}}>Big Tech Core</div>
          <div style={{fontSize: 11, background: 'rgba(165,151,255,.16)', color: '#5d4fa0', borderRadius: 6, padding: '3px 8px'}}>Buy &amp; hold</div>
        </div>
        <div style={{display: 'flex', gap: 6, marginTop: 10}}>
          {TICKERS.map(({t, c}, i) => (
            <span key={t} style={{opacity: enter(f, 22 + i * 3, 14), display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500, background: '#F1ECE5', borderRadius: 999, padding: '4px 9px'}}>
              <span style={{width: 7, height: 7, borderRadius: '50%', background: c}} />{t}
            </span>
          ))}
        </div>
        <div style={{marginTop: 12}}><Chart p={draw} /></div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(27,22,32,.5)', marginTop: 6}}><span>Start</span><span>End</span></div>
        <div style={{display: 'flex', gap: 8, marginTop: 12, opacity: enter(f, 96, 18)}}>
          <Stat label="Return" value="+7.1%" tone="#4F8A5F" />
          <Stat label="Max drawdown" value="−8.9%" />
          <Stat label="Benchmark" value="+3.2%" />
        </div>
        <div style={{display: 'flex', gap: 10, whiteSpace: 'nowrap', fontSize: 10.5, fontWeight: 500, marginTop: 12, opacity: enter(f, 106, 18)}}>
          <Check>Backtested with fees</Check><Check>Limits enforced by vault</Check><Check>Every decision verifiable</Check>
        </div>
        <div style={{fontSize: 9.5, color: 'rgba(27,22,32,.45)', marginTop: 9}}>Illustrative backtest · hypothetical, not a real result</div>
      </div>
    </AbsoluteFill>
  );
};
