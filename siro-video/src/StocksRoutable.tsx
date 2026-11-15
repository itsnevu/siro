// "10 tokenized stocks are now routable on Siro" — 10s announcement in the SIRO Sculpted Product Motion style.
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, F} from './theme';
import {Brand, Logo, clamp} from './components/Siro';
import {RevealText} from './components/RevealText';

export const SR_W = 1920, SR_H = 1080, SR_DUR = 330;

const STOCKS: {t: string; name: string; logo?: string}[] = [
  {t: 'AAPL', name: 'Apple', logo: 'AAPL'}, {t: 'MSFT', name: 'Microsoft', logo: 'MSFT'}, {t: 'NVDA', name: 'NVIDIA', logo: 'NVDA'},
  {t: 'AMZN', name: 'Amazon', logo: 'AMZN'}, {t: 'GOOGL', name: 'Alphabet', logo: 'GOOGL'}, {t: 'TSLA', name: 'Tesla', logo: 'TSLA'},
  {t: 'META', name: 'Meta', logo: 'META'}, {t: 'SPY', name: 'S&P 500 ETF'}, {t: 'QQQ', name: 'Nasdaq-100 ETF'}, {t: 'COIN', name: 'Coinbase', logo: 'COIN'},
];
const PIPE: {label: string; icon: string | null}[] = [{label: 'Priced by Chainlink', icon: 'brands/chainlink.svg'}, {label: 'Traded on Uniswap v3', icon: 'brands/uniswap.svg'}, {label: 'Held in a vault you own', icon: null}];

const pop = (f: number, d = 0) => spring({frame: f - d, fps: 30, config: {damping: 24, stiffness: 100, mass: 1.1}});
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const COIN_AT = (i: number) => 52 + i * 5;
const PIPE_AT = (i: number) => 150 + i * 18;

/** Satin coin: gradient rim with layered sides, white face carrying the real company logo. */
const StockCoin = ({s, f, i}: {s: (typeof STOCKS)[number]; f: number; i: number}) => {
  const p = pop(f, COIN_AT(i));
  const turn = lerp(-70, 0, p) + Math.sin((f + i * 11) / 34) * 6 * p;
  const size = 132;
  return (
    <div style={{width: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: ramp(f, COIN_AT(i) - 2, COIN_AT(i) + 6), translate: `0 ${lerp(60, Math.sin((f + i * 17) / 40) * 5, p)}px`}}>
      <div style={{position: 'relative', width: size, height: size, transform: `perspective(1600px) rotateY(${turn}deg) rotateX(6deg)`, transformStyle: 'preserve-3d', scale: lerp(0.6, 1, p)}}>
        {[12, 8, 4].map((z) => <div key={z} style={{position: 'absolute', inset: 0, borderRadius: '50%', transform: `translateZ(${-z}px)`, background: z > 6 ? '#5d4fa0' : '#7566B5'}} />)}
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: C.gradient, boxShadow: 'inset 6px 9px 14px rgba(244,242,238,.35),inset -8px -10px 18px rgba(27,22,32,.25),0 26px 44px rgba(0,0,0,.45)', display: 'grid', placeItems: 'center'}}>
          <div style={{width: size - 22, height: size - 22, borderRadius: '50%', overflow: 'hidden', background: s.logo ? '#fff' : C.surface, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,.18)'}}>
            {s.logo
              ? <Img src={staticFile(`stocks/${s.logo}.svg`)} style={{width: '100%', height: '100%'}} />
              : <span style={{fontFamily: F.display, fontSize: 34, letterSpacing: -1, background: C.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{s.t}</span>}
          </div>
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(${120 + turn * 2}deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%)`}} />
        </div>
      </div>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 30, fontWeight: 600, letterSpacing: 0.5}}>{s.t}</div>
        <div style={{fontSize: 19, color: C.muted, marginTop: 2}}>{s.name}</div>
      </div>
    </div>
  );
};

const Pipeline = ({f}: {f: number}) => {
  const xs = [430, 960, 1490];
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 880, height: 90}}>
      <svg width={1920} height={90} style={{position: 'absolute', inset: 0}}>
        {[0, 1].map((i) => (
          <path key={i} d={`M${xs[i] + 200},45 C${xs[i] + 260},10 ${xs[i + 1] - 260},80 ${xs[i + 1] - 200},45`} fill="none" stroke="url(#pipe)" strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ramp(f, PIPE_AT(i) + 8, PIPE_AT(i) + 26)} />
        ))}
        <defs><linearGradient id="pipe" x1="0" x2="1"><stop offset="0" stopColor={C.purple} /><stop offset="1" stopColor={C.peach} /></linearGradient></defs>
      </svg>
      {PIPE.map(({label, icon}, i) => {
        const p = pop(f, PIPE_AT(i));
        return (
          <div key={label} style={{position: 'absolute', left: xs[i] - 200, width: 400, top: 10, height: 70, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 27, fontWeight: 500, background: 'linear-gradient(150deg,#232535,#191B27)', border: '1px solid rgba(165,151,255,.28)', boxShadow: 'inset 1px 2px 1px rgba(244,242,238,.12),4px 5px 0 #2b2c3d,0 18px 34px rgba(0,0,0,.4)', opacity: ramp(f, PIPE_AT(i), PIPE_AT(i) + 8), transform: `perspective(1400px) rotateX(${lerp(40, 0, p)}deg) translateY(${lerp(30, 0, p)}px)`}}>
            {icon ? <Img src={staticFile(icon)} style={{width: 48, height: 48, borderRadius: "50%"}} /> : <span style={{width: 48, height: 48, borderRadius: "50%", background: C.bg, border: "1px solid rgba(165,151,255,.4)", display: "grid", placeItems: "center"}}><Logo size={28} /></span>}
            {label}
          </div>
        );
      })}
    </div>
  );
};

const Main = () => {
  const f = useCurrentFrame();
  const out = ramp(f, 262, 284);
  const cam = lerp(1.04, 1, ramp(f, 0, 120));
  return (
    <AbsoluteFill style={{background: C.bg, color: C.text, fontFamily: F.sans, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1300, height: 1300, left: 310, top: -700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.22),rgba(238,178,203,.08) 45%,transparent 70%)', filter: 'blur(40px)'}} />
      <AbsoluteFill style={{scale: cam * lerp(1, 0.96, out), opacity: 1 - out, filter: `blur(${out * 6}px)`}}>
        <div style={{position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 24, letterSpacing: 3, color: C.purple, fontWeight: 600, opacity: ramp(f, 0, 12)}}><Logo size={30} />NOW ON SIRO</div>
          <div style={{fontFamily: F.display, fontSize: 104, letterSpacing: -5, lineHeight: 1.02, marginTop: 18}}>
            <RevealText text="10 tokenized stocks," start={6} step={0.9} />{' '}
            <span style={{fontFamily: F.italic, fontStyle: 'italic', letterSpacing: -2, color: C.pink}}><RevealText text="now routable." start={24} step={1.1} /></span>
          </div>
        </div>
        <div style={{position: 'absolute', top: 330, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', rowGap: 34, padding: '0 435px'}}>
          {STOCKS.map((s, i) => <StockCoin key={s.t} s={s} f={f} i={i} />)}
        </div>
        <Pipeline f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{display: 'grid', placeItems: 'center', alignContent: 'center', gap: 34, opacity: ramp(f, 272, 292), scale: lerp(0.92, 1.03, ramp(f, 272, 330))}}>
        <div style={{filter: 'drop-shadow(0 22px 24px rgba(165,151,255,.22))'}}><Brand size={140} /></div>
        <div style={{fontSize: 38, fontWeight: 500, textAlign: 'center'}}>usesiro.xyz</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type Cue = {at: number; d: number; sound: string; gain: number};
const CUES: Cue[] = [
  {at: 4, d: 6, sound: 'tick', gain: 0.2},
  ...STOCKS.map((_s, i): Cue => ({at: COIN_AT(i), d: 8, sound: 'tick', gain: 0.13 + i * 0.008})),
  {at: COIN_AT(9) + 6, d: 15, sound: 'sparkle', gain: 0.24},
  ...PIPE.map((_p, i): Cue => ({at: PIPE_AT(i), d: 12, sound: 'card', gain: 0.3})),
  {at: PIPE_AT(2) + 20, d: 22, sound: 'confirm', gain: 0.45},
  {at: 262, d: 38, sound: 'brand', gain: 0.55},
  {at: 296, d: 22, sound: 'confirm', gain: 0.35},
];
const Music = () => {
  const f = useCurrentFrame();
  return <Audio src={staticFile('audio/designed/hazy-after-hours.mp3')} volume={interpolate(f, [0, 18, SR_DUR - 36, SR_DUR], [0, 0.5, 0.5, 0], clamp)} />;
};
const Sfx = ({c}: {c: Cue}) => {
  const f = useCurrentFrame();
  return <Audio src={staticFile(`audio/designed/${c.sound}.wav`)} volume={interpolate(f, [0, 1, Math.max(2, c.d - 4), c.d], [0, c.gain, c.gain, 0], clamp)} />;
};

export const StocksRoutable = () => (
  <AbsoluteFill>
    <Main />
    <Music />
    {CUES.map((c, i) => <Sequence key={i} from={c.at} durationInFrames={c.d} layout="none"><Sfx c={c} /></Sequence>)}
  </AbsoluteFill>
);
