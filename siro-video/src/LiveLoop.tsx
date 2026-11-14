// 5-second seamless banner loop: "Siro is live on Robinhood Chain".
// Every motion is a function of t = frame / LOOP on a full 2π period, so frame LOOP equals frame 0.
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from './theme';
import {Logo} from './components/Siro';

export const LOOP = 150;
export const LOOP_W = 1920;
export const LOOP_H = 750;

const TAU = Math.PI * 2;
const ORBIT = {cx: 1400, cy: 400, rx: 380, ry: 105, tilt: -7};

const Coin = ({size, turn}: {size: number; turn: number}) => (
  <div style={{position: 'relative', width: size, height: size, transform: `perspective(1600px) rotateY(${turn}deg) rotateX(4deg)`, transformStyle: 'preserve-3d'}}>
    {[14, 10, 6, 2].map((z) => (
      <div key={z} style={{position: 'absolute', inset: 0, borderRadius: '50%', transform: `translateZ(${-z}px)`, background: z > 8 ? '#5d4fa0' : '#7566B5'}} />
    ))}
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: C.gradient, border: '2px solid rgba(244,242,238,.35)', boxShadow: 'inset 10px 14px 20px rgba(244,242,238,.35),inset -12px -16px 26px rgba(27,22,32,.22)', display: 'grid', placeItems: 'center', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${120 + turn}deg,transparent 35%,rgba(255,255,255,.32) 50%,transparent 65%)`}} />
      <Img src={staticFile('art/robinhood-feather.png')} style={{height: size * 0.56, position: 'relative', translate: '4px 0', opacity: .92}} />
    </div>
  </div>
);

const Pedestal = ({shadow}: {shadow: number}) => (
  <div style={{position: 'absolute', left: ORBIT.cx - 230, top: 470, width: 460, height: 150}}>
    <div style={{position: 'absolute', left: -40, right: -40, top: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(27,22,32,.28),transparent 70%)', filter: 'blur(10px)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 46, height: 76, borderRadius: '0 0 50% 50% / 0 0 46px 46px', background: 'linear-gradient(90deg,#d9d0c6 0%,#f4f2ee 32%,#e9e1d6 62%,#c9bfb4 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 92, borderRadius: '50%', background: 'radial-gradient(ellipse at 40% 35%,#fbfaf7,#ece6de 70%)', boxShadow: 'inset 0 -3px 0 rgba(27,22,32,.08),inset 2px 3px 2px rgba(255,255,255,.9)'}}>
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 230 * shadow, height: 34 * shadow, translate: '-50% -50%', borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(27,22,32,.32),transparent 70%)', filter: 'blur(6px)'}} />
    </div>
  </div>
);

const OrbitPath = ({half}: {half: 'back' | 'front'}) => (
  <svg width={LOOP_W} height={LOOP_H} style={{position: 'absolute', inset: 0}}>
    <defs>
      <clipPath id={`orbit-${half}`}><rect x={0} y={half === 'back' ? 0 : ORBIT.cy} width={LOOP_W} height={half === 'back' ? ORBIT.cy : LOOP_H} /></clipPath>
    </defs>
    <g transform={`rotate(${ORBIT.tilt} ${ORBIT.cx} ${ORBIT.cy})`} clipPath={`url(#orbit-${half})`}>
      <ellipse cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} fill="none" stroke="rgba(165,151,255,.35)" strokeWidth={7} style={{filter: 'blur(5px)'}} />
      <ellipse cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} fill="none" stroke="#fff" strokeWidth={2.2} />
    </g>
  </svg>
);

const Satellite = ({a}: {a: number}) => {
  const r = (ORBIT.tilt * Math.PI) / 180;
  const x0 = Math.cos(a) * ORBIT.rx, y0 = Math.sin(a) * ORBIT.ry;
  const x = ORBIT.cx + x0 * Math.cos(r) - y0 * Math.sin(r);
  const y = ORBIT.cy + x0 * Math.sin(r) + y0 * Math.cos(r);
  const depth = (Math.sin(a) + 1) / 2; // 0 back, 1 front
  const s = 0.82 + depth * 0.3;
  return (
    <div style={{position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, scale: s, borderRadius: '50%', background: 'linear-gradient(145deg,#2a2c3c,#0A0B12)', border: '1px solid rgba(165,151,255,.45)', boxShadow: '0 0 0 4px rgba(244,242,238,.6),0 12px 24px rgba(27,22,32,.3)', display: 'grid', placeItems: 'center'}}>
      <Logo size={30} />
    </div>
  );
};

export const LiveLoop = () => {
  const f = useCurrentFrame();
  const t = (f % LOOP) / LOOP;
  const w = TAU * t;
  const float = Math.sin(w);
  const a = w + Math.PI * 0.15;
  const front = Math.sin(a) > 0;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(115deg,#F4F2EE 0%,#EFE9E1 55%,#E9E1D6 100%)', overflow: 'hidden', fontFamily: F.sans, color: C.ink}}>
      <div style={{position: 'absolute', width: 900, height: 900, left: 1250 + Math.cos(w) * 40, top: 300 + Math.sin(w) * 30, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.55),rgba(238,178,203,.25) 45%,transparent 70%)', filter: 'blur(40px)'}} />
      <div style={{position: 'absolute', width: 800, height: 800, left: -260 + Math.sin(w) * 40, top: -420 + Math.cos(w) * 30, borderRadius: '50%', background: 'radial-gradient(circle,rgba(243,205,176,.6),transparent 68%)', filter: 'blur(50px)'}} />

      <div style={{position: 'absolute', left: 120, top: 190}}>
        <div style={{fontFamily: F.display, fontSize: 112, lineHeight: 1.02, letterSpacing: -5, textShadow: '0 14px 28px rgba(27,22,32,.10)'}}>
          Siro is live on
          <br />
          <span style={{fontFamily: F.italic, fontStyle: 'italic', letterSpacing: -2}}>Robinhood Chain</span>
          <br />
          mainnet
        </div>
      </div>

      <OrbitPath half="back" />
      {!front && <Satellite a={a} />}
      <Pedestal shadow={1 - float * 0.12} />
      <div style={{position: 'absolute', left: ORBIT.cx - 150, top: 200 + float * -10, filter: 'drop-shadow(0 26px 30px rgba(27,22,32,.22))'}}>
        <Coin size={300} turn={Math.sin(w) * 24} />
      </div>
      <OrbitPath half="front" />
      {front && <Satellite a={a} />}
    </AbsoluteFill>
  );
};
