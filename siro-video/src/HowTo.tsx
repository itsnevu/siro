// "How to use Siro" product demo in the SIRO Sculpted Product Motion style.
// A virtual camera zooms to what the cursor clicks. Timing, transitions and sound cues share one table.
import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {C, F} from './theme';
import {Brand, Logo, clamp} from './components/Siro';
import {DepthTransition, type DepthProps} from './components/DepthTransition';
import {RevealText} from './components/RevealText';
import {Phone} from './Montage';

// ---------- timing (single source for edit and audio) ----------
const SH = [105, 210, 170, 150, 185, 160, 90, 105];
const TR: {mode: DepthProps['mode']; d: number; dir?: number; sound: string}[] = [
  {mode: 'focus', d: 36, sound: 'focus'},
  {mode: 'turn', d: 18, dir: 1, sound: 'sweep'},
  {mode: 'lift', d: 20, sound: 'lift'},
  {mode: 'mosaic', d: 48, sound: 'mosaic'},
  {mode: 'turn', d: 18, dir: -1, sound: 'sweep'},
  {mode: 'lift', d: 20, sound: 'lift'},
  {mode: 'brand', d: 38, sound: 'brand'},
];
const ST = SH.reduce<number[]>((s, _d, i) => (s.push(i ? s[i - 1] + SH[i - 1] - TR[i - 1].d : 0), s), []);
export const HOWTO_FRAMES = SH.reduce((a, b) => a + b, 0) - TR.reduce((a, t) => a + t.d, 0);

// ---------- motion helpers ----------
const io = Easing.bezier(0.4, 0, 0.2, 1);
const kf = (f: number, fs: number[], vs: number[]) => interpolate(f, fs, vs, {...clamp, easing: io});
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const pop = (f: number, d = 0) => spring({frame: f - d, fps: 30, config: {damping: 24, stiffness: 100, mass: 1.1}});
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

type Shot = {fs: number[]; s: number[]; x: number[]; y: number[]};
const camAt = (f: number, c: Shot) => ({s: kf(f, c.fs, c.s), x: kf(f, c.fs, c.x), y: kf(f, c.fs, c.y)});
/** Zooms so that content point (x, y) sits at the frame centre at scale s. */
const Cam: React.FC<React.PropsWithChildren<{shot: Shot}>> = ({shot, children}) => {
  const f = useCurrentFrame();
  const {s, x, y} = camAt(f, shot);
  return <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${960 - x * s}px,${540 - y * s}px) scale(${s})`}}>{children}</AbsoluteFill>;
};

/** Arrow cursor with press-in and a ripple on each click. Lives inside the camera so it zooms with the UI. */
const Cursor = ({path, clicks, hideAt = 9999}: {path: [number, number, number][]; clicks: number[]; hideAt?: number}) => {
  const f = useCurrentFrame();
  const fs = path.map((p) => p[0]);
  const x = kf(f, fs, path.map((p) => p[1])), y = kf(f, fs, path.map((p) => p[2]));
  const vis = ramp(f, fs[0], fs[0] + 8) * (1 - ramp(f, hideAt, hideAt + 8));
  const press = clicks.reduce((m, c) => Math.min(m, 1 - 0.18 * Math.max(0, 1 - Math.abs(f - c) / 4)), 1);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: vis, zIndex: 50, pointerEvents: 'none'}}>
      {clicks.map((c) => {
        const r = ramp(f, c, c + 14);
        return r > 0 && r < 1 ? <div key={c} style={{position: 'absolute', left: -26 * (0.4 + r), top: -26 * (0.4 + r), width: 52 * (0.4 + r), height: 52 * (0.4 + r), borderRadius: '50%', border: '2px solid rgba(165,151,255,.9)', opacity: 1 - r}} /> : null;
      })}
      <svg width="30" height="36" viewBox="0 0 22 32" style={{scale: press, transformOrigin: '0 0', filter: 'drop-shadow(0 4px 6px rgba(10,11,18,.35))'}}>
        <path d="M1 1 L1 25 L7 19.5 L11.5 30 L16 28 L11.5 18 L20 18 Z" fill="#F4F2EE" stroke="#1B1620" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const Stage: React.FC<React.PropsWithChildren<{tone: 'dark' | 'cream' | 'purple'}>> = ({tone, children}) => (
  <AbsoluteFill style={{background: tone === 'dark' ? C.bg : tone === 'purple' ? C.purple : C.cream, color: tone === 'dark' ? C.text : C.ink, fontFamily: F.sans, overflow: 'hidden'}}>
    {tone === 'cream' ? <div style={{position: 'absolute', width: 1100, height: 1100, right: -300, top: -260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.28),rgba(238,178,203,.16) 45%,transparent 70%)', filter: 'blur(40px)'}} /> : null}
    {tone === 'dark' ? <div style={{position: 'absolute', width: 1000, height: 1000, right: -200, bottom: -500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.22),transparent 70%)', filter: 'blur(50px)'}} /> : null}
    {children}
  </AbsoluteFill>
);

/** Step title, fixed to the frame (outside the camera). Fades while the camera is zoomed in. */
const StepLabel = ({n, title, sub, f, hide = 0, dark = false}: {n: number; title: string; sub: string; f: number; hide?: number; dark?: boolean}) => {
  const p = pop(f, 4);
  return (
    <div style={{position: 'absolute', left: 110, top: 300, width: 640, opacity: (1 - hide) * ramp(f, 2, 14), translate: `${lerp(-30, 0, p)}px 0`}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 22, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: dark ? C.purple : '#5d4fa0'}}>
        <span style={{width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: C.gradient, color: C.ink, letterSpacing: 0, fontSize: 19}}>{n}</span>Step {n}
      </div>
      <div style={{fontFamily: F.display, fontSize: 80, lineHeight: 1.02, letterSpacing: -3.5, marginTop: 26, textShadow: dark ? 'none' : '0 14px 28px rgba(27,22,32,.10)'}}><RevealText text={title} start={6} step={0.9} /></div>
      <div style={{fontSize: 26, lineHeight: 1.45, marginTop: 26, color: dark ? C.muted : 'rgba(27,22,32,.66)', opacity: ramp(f, 26, 40)}}>{sub}</div>
    </div>
  );
};

const cardShadow = 'inset 1px 2px 1px rgba(255,255,255,.5),4px 5px 0 #c9bfd8,8px 10px 0 #a99cc0,0 14px 20px rgba(27,22,32,.18),0 42px 70px rgba(27,22,32,.16)';
const darkShadow = 'inset 1px 2px 1px rgba(244,242,238,.14),4px 5px 0 #2b2c3d,8px 10px 0 #1d1e2b,0 14px 20px rgba(0,0,0,.3),0 42px 70px rgba(0,0,0,.35)';
const tilt = (f: number, from = 18) => `perspective(1700px) rotateY(${lerp(-from, 0, pop(f, 0))}deg) rotateX(${lerp(8, 0, pop(f, 0))}deg)`;

// ---------- 1. Intro: the five steps are dealt from one stack ----------
const STEPS = ['Connect', 'Plan', 'Test', 'Limits', 'Verify'];
const DEAL = (i: number) => 26 + i * 6;
const Intro = () => {
  const f = useCurrentFrame();
  const push = kf(f, [80, 105], [1, 1.12]);
  return (
    <Stage tone="cream">
      <AbsoluteFill style={{transformOrigin: '420px 700px', scale: push}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center'}}>
          <div style={{fontSize: 22, letterSpacing: 4, color: '#5d4fa0', fontWeight: 600, opacity: ramp(f, 2, 12)}}>FIVE STEPS</div>
          <div style={{fontFamily: F.display, fontSize: 132, letterSpacing: -6, lineHeight: 1, marginTop: 18, textShadow: '0 4px 8px rgba(27,22,32,.06),0 24px 48px rgba(27,22,32,.12)'}}>
            <RevealText text="How to use" start={4} step={1.1} /> <i style={{fontFamily: F.italic, letterSpacing: -2}}><RevealText text="Siro." start={16} step={1.6} /></i>
          </div>
        </div>
        {STEPS.map((t, i) => {
          const p = pop(f, DEAL(i));
          const x = lerp(960, 300 + i * 330, p), r = lerp(-8 + i * 4, (i - 2) * 2.5, p), y = lerp(760, 690 - Math.cos((i - 2) * 0.5) * 30, p);
          return (
            <div key={t} style={{position: 'absolute', left: x - 130, top: y - 150, width: 260, height: 300, borderRadius: 26, background: i === 0 ? C.gradient : '#FBFAF7', boxShadow: i === 0 ? 'inset 1px 2px 1px rgba(255,255,255,.55),4px 5px 0 #9b80b4,8px 10px 0 #79618e,0 14px 20px rgba(27,22,32,.2),0 42px 70px rgba(27,22,32,.18)' : cardShadow, transform: `perspective(1600px) rotateZ(${r}deg) rotateY(${lerp(30, 0, p)}deg)`, opacity: ramp(f, DEAL(i) - 4, DEAL(i) + 2), padding: 28, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 10 - i}}>
              <span style={{width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 600, background: i === 0 ? C.ink : C.gradient, color: i === 0 ? C.text : C.ink}}>{i + 1}</span>
              <div style={{fontFamily: F.display, fontSize: 44, letterSpacing: -1.5}}>{t}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Stage>
  );
};

// ---------- 2. Connect wallet (laptop, zoom to button and modal) ----------
const LX = 760, LY = 230, SX = LX + 18, SY = LY + 18;
const BTN = {x: SX + 715, y: SY + 426};
const MOD = {x: SX + 482, y: SY + 302};
const ITEM = (i: number) => ({x: SX + 440, y: SY + 300 + i * 68});
const WALLETS = [{n: 'MetaMask', c: '#F6851B'}, {n: 'Rabby', c: '#8697FF'}, {n: 'Coinbase Wallet', c: '#0052FF'}];
const CLICK_BTN = 62, CLICK_WALLET = 128;
const CONNECT_CAM: Shot = {fs: [0, 42, 74, 104, 122, 165, 196], s: [1, 1, 1.75, 1.75, 1.6, 1.6, 1], x: [960, 960, BTN.x, BTN.x, MOD.x, MOD.x, 960], y: [540, 540, BTN.y, BTN.y, MOD.y, MOD.y, 540]};

const LaptopFrame: React.FC<React.PropsWithChildren<{f: number}>> = ({f, children}) => (
  <div style={{position: 'absolute', left: LX, top: LY, width: 1000, transform: tilt(f, 16), transformOrigin: '50% 100%'}}>
    <div style={{height: 640, padding: 18, borderRadius: 30, boxSizing: 'border-box', background: 'linear-gradient(130deg,#b7b4bd,#474550 40%,#918e99)', boxShadow: 'inset 1px 2px 1px rgba(255,255,255,.8),5px 8px 0 #4c4956,0 18px 25px rgba(27,22,32,.2),0 55px 95px rgba(27,22,32,.2)'}}>
      <div style={{height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', background: C.text}}>
        {children}
        <div style={{position: 'absolute', top: 0, left: '43%', width: '14%', height: 20, borderRadius: '0 0 9px 9px', background: '#15131b', zIndex: 30}} />
      </div>
    </div>
    <div style={{position: 'relative', left: -65, width: 1130, height: 38, borderRadius: '3px 3px 45px 45px', background: 'linear-gradient(#e1dee5,#9995a3 35%,#5f5a6b)', boxShadow: '0 8px 5px rgba(27,22,32,.2),0 35px 45px rgba(27,22,32,.18)'}}><div style={{margin: '0 auto', width: 170, height: 12, borderRadius: '0 0 16px 16px', background: '#827d8d'}} /></div>
  </div>
);

const Connect = () => {
  const f = useCurrentFrame();
  const zoom = ramp(camAt(f, CONNECT_CAM).s, 1, 1.25);
  const modal = pop(f, CLICK_BTN + 6);
  const done = ramp(f, CLICK_WALLET + 8, CLICK_WALLET + 18);
  const pressed = Math.abs(f - CLICK_BTN) < 4 ? 0.96 : 1;
  return (
    <Stage tone="cream">
      <Cam shot={CONNECT_CAM}>
        <LaptopFrame f={f}>
          <div style={{position: 'absolute', inset: 0, display: 'flex'}}>
            <div style={{width: 482, background: 'linear-gradient(160deg,#191B27,#0A0B12)', color: C.text, padding: '70px 44px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden'}}>
              <div style={{position: 'absolute', width: 420, height: 420, right: -160, bottom: -160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,151,255,.4),transparent 70%)'}} />
              <Logo size={46} />
              <div style={{fontFamily: F.display, fontSize: 46, lineHeight: 1.05, letterSpacing: -1.5, marginTop: 250}}>Capital follows<br /><i style={{fontFamily: F.italic}}>intelligence.</i></div>
            </div>
            <div style={{flex: 1, padding: '120px 48px', position: 'relative'}}>
              <div style={{fontSize: 13, letterSpacing: 2, color: 'rgba(27,22,32,.5)'}}>MAKE YOURSELF AT HOME</div>
              <div style={{fontFamily: F.display, fontSize: 50, letterSpacing: -2, marginTop: 14}}>Welcome to <i style={{fontFamily: F.italic}}>Siro.</i></div>
              <div style={{fontSize: 17, color: 'rgba(27,22,32,.6)', marginTop: 10}}>Connect your own wallet. Stay in control.</div>
              <div style={{position: 'absolute', left: 48, top: 400, width: 370, height: 52, borderRadius: 99, background: C.ink, color: C.text, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 500, scale: pressed, boxShadow: '0 10px 20px rgba(27,22,32,.2)'}}>{done > 0.5 ? 'Opening your workspace…' : 'Continue with a wallet ↗'}</div>
            </div>
          </div>
          {modal > 0.01 ? (
            <div style={{position: 'absolute', inset: 0, background: `rgba(10,11,18,${0.45 * modal * (1 - done)})`, zIndex: 20}}>
              <div style={{position: 'absolute', left: 302, top: 102, width: 360, height: 400, borderRadius: 22, background: '#FBFAF7', boxShadow: '0 4px 0 #ddd3c7,0 30px 60px rgba(10,11,18,.35)', padding: 26, boxSizing: 'border-box', opacity: modal * (1 - done), transform: `translateY(${(1 - modal) * 30}px) scale(${0.94 + modal * 0.06})`}}>
                <div style={{fontSize: 11, letterSpacing: 2, color: 'rgba(27,22,32,.5)'}}>YOUR WALLET. YOUR CONTROL.</div>
                <div style={{fontFamily: F.display, fontSize: 30, letterSpacing: -1, marginTop: 10}}>A familiar way <i style={{fontFamily: F.italic}}>in.</i></div>
                <div style={{fontSize: 13, color: 'rgba(27,22,32,.55)', marginTop: 6}}>Wallets detected in this browser</div>
                {WALLETS.map((w, i) => {
                  const hot = i === 0 && f > CLICK_WALLET - 14;
                  return (
                    <div key={w.n} style={{position: 'absolute', left: 26, right: 26, top: 170 + i * 68, height: 58, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: hot ? 'rgba(165,151,255,.18)' : '#F1ECE5', border: hot ? '1.5px solid #A597FF' : '1.5px solid transparent', opacity: ramp(f, CLICK_BTN + 12 + i * 4, CLICK_BTN + 22 + i * 4)}}>
                      <span style={{width: 30, height: 30, borderRadius: 8, background: w.c, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15}}>{w.n[0]}</span>
                      <span style={{fontSize: 16, fontWeight: 500, flex: 1}}>{w.n}</span>
                      <span style={{fontSize: 12, color: 'rgba(27,22,32,.5)'}}>Detected ↗</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {done > 0 ? (
            <div style={{position: 'absolute', left: 302, top: 152, width: 360, height: 300, borderRadius: 22, background: '#FBFAF7', zIndex: 25, display: 'grid', placeItems: 'center', textAlign: 'center', opacity: done * (1 - ramp(f, 172, 186)), boxShadow: '0 30px 60px rgba(10,11,18,.3)', scale: 0.96 + done * 0.04}}>
              <div>
                <div style={{width: 64, height: 64, borderRadius: '50%', background: C.mint, margin: '0 auto', display: 'grid', placeItems: 'center', fontSize: 32, color: C.ink, scale: pop(f, CLICK_WALLET + 10)}}>✓</div>
                <div style={{fontFamily: F.display, fontSize: 30, marginTop: 16}}>Connected</div>
                <div style={{display: 'inline-block', marginTop: 10, fontSize: 15, fontFamily: 'monospace', background: '#F1ECE5', borderRadius: 99, padding: '6px 14px'}}>0x7a3e…91c4 · Robinhood Chain</div>
              </div>
            </div>
          ) : null}
        </LaptopFrame>
        <Cursor path={[[28, 1700, 1020], [56, BTN.x + 30, BTN.y + 6], [96, BTN.x + 30, BTN.y + 6], [122, ITEM(0).x, ITEM(0).y]]} clicks={[CLICK_BTN, CLICK_WALLET]} hideAt={150} />
      </Cam>
      <StepLabel n={1} title="Connect your wallet" sub="Any browser wallet. No email, no password. Siro never asks for your recovery phrase." f={f} hide={zoom} />
    </Stage>
  );
};

// ---------- 3. Write the strategy ----------
const CX = 930, CY = 150;
const TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'TSLA'];
const chip = (i: number) => ({x: CX + 48 + (i % 3) * 262 + 120, y: CY + 330 + Math.floor(i / 3) * 84 + 32});
const PICKS = [0, 1, 2, 3, 4];
const PICK_AT = (k: number) => 62 + k * 12;
const RUN = {x: CX + 430, y: CY + 655};
const CLICK_RUN = 140;
const STRAT_CAM: Shot = {fs: [0, 40, 66, 112, 132, 152, 168], s: [1, 1, 1.22, 1.22, 1.3, 1.3, 1.05], x: [960, 960, CX + 430, CX + 430, RUN.x, RUN.x, 1100], y: [540, 540, CY + 400, CY + 400, RUN.y - 60, RUN.y - 60, 540]};

const Strategy = () => {
  const f = useCurrentFrame();
  const zoom = ramp(camAt(f, STRAT_CAM).s, 1, 1.18);
  const name = 'Big Tech Core';
  const typed = name.slice(0, Math.floor(ramp(f, 24, 50) * name.length));
  const running = f > CLICK_RUN;
  return (
    <Stage tone="cream">
      <Cam shot={STRAT_CAM}>
        <div style={{position: 'absolute', left: CX, top: CY, width: 860, height: 780, borderRadius: 30, background: '#FBFAF7', boxShadow: cardShadow, padding: 48, boxSizing: 'border-box', transform: tilt(f, 22), opacity: ramp(f, 0, 10)}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontFamily: F.display, fontSize: 40, letterSpacing: -1.5}}>Strategy Studio</div>
            <div style={{fontSize: 16, background: 'rgba(165,151,255,.18)', color: '#5d4fa0', borderRadius: 99, padding: '6px 14px'}}>Draft</div>
          </div>
          <div style={{fontSize: 17, fontWeight: 600, marginTop: 40}}>Name</div>
          <div style={{marginTop: 10, height: 60, borderRadius: 14, border: '1.5px solid rgba(27,22,32,.14)', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 24}}>{typed}<span style={{width: 2, height: 28, background: C.ink, marginLeft: 2, opacity: f < 56 && Math.floor(f / 8) % 2 === 0 ? 1 : 0}} /></div>
          <div style={{fontSize: 17, fontWeight: 600, marginTop: 34}}>Tokenized stocks</div>
          {TICKERS.map((t, i) => {
            const k = PICKS.indexOf(i);
            const on = k >= 0 && f >= PICK_AT(k);
            const p = k >= 0 ? pop(f, PICK_AT(k)) : 0;
            const {x, y} = chip(i);
            return (
              <div key={t} style={{position: 'absolute', left: x - CX - 120, top: y - CY - 32, width: 240, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', fontSize: 22, fontWeight: 600, background: on ? C.gradient : '#F1ECE5', boxShadow: on ? '3px 4px 0 #a99cc0,0 12px 18px rgba(27,22,32,.14)' : 'none', translate: `0 ${on ? -3 * p : 0}px`, opacity: ramp(f, 14 + i * 3, 24 + i * 3)}}>
                {t}<span style={{width: 24, height: 24, borderRadius: '50%', border: on ? 'none' : '1.5px solid rgba(27,22,32,.25)', background: on ? C.ink : 'transparent', color: C.text, display: 'grid', placeItems: 'center', fontSize: 14, scale: on ? 0.6 + 0.4 * p : 1}}>{on ? '✓' : ''}</span>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 48, right: 48, top: 520, display: 'flex', gap: 14, fontSize: 19}}>
            {['Equal weight · 20% each', 'Rebalance weekly'].map((r, i) => <div key={r} style={{flex: 1, borderRadius: 14, background: '#F1ECE5', padding: '16px 18px', opacity: ramp(f, 118 + i * 5, 128 + i * 5)}}>{r}</div>)}
          </div>
          <div style={{position: 'absolute', left: 48, right: 48, top: 620, height: 70, borderRadius: 99, background: C.ink, color: C.text, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 500, scale: Math.abs(f - CLICK_RUN) < 4 ? 0.97 : 1}}>{running ? 'Running backtest…' : 'Run backtest'}</div>
        </div>
        <Cursor path={[[44, 1750, 1060], ...PICKS.flatMap((i, k): [number, number, number][] => [[PICK_AT(k) - 6, chip(i).x + 20, chip(i).y + 8], [PICK_AT(k) + 4, chip(i).x + 20, chip(i).y + 8]]), [CLICK_RUN - 6, RUN.x + 40, RUN.y + 6]]} clicks={[...PICKS.map((_i, k) => PICK_AT(k)), CLICK_RUN]} hideAt={158} />
      </Cam>
      <StepLabel n={2} title="Write the plan" sub="Pick tokenized stocks, set the weights and a rebalance rule. Plain choices, no code." f={f} hide={zoom} />
    </Stage>
  );
};

// ---------- 4. Backtest and paper trade ----------
const SERIES = (() => {
  let s = 11, v = 0;
  const out: number[] = [];
  for (let i = 0; i < 80; i++) {
    s = (s * 9301 + 49297) % 233280;
    v += (i < 6 ? -1.1 : i < 30 ? 0.5 : i < 36 ? 1.5 : i < 70 ? 0.14 : -0.8) + (s / 233280 - 0.5) * 1.5;
    out.push(v);
  }
  return out;
})();
const PAPER = {x: 1310, y: 862};
const CLICK_PAPER = 112;
const TEST_CAM: Shot = {fs: [0, 96, 116, 140, 150], s: [1, 1, 1.2, 1.2, 1.12], x: [960, 960, PAPER.x - 120, PAPER.x - 120, 1200], y: [540, 540, PAPER.y - 120, PAPER.y - 120, 600]};

const Backtest = () => {
  const f = useCurrentFrame();
  const zoom = ramp(camAt(f, TEST_CAM).s, 1, 1.15);
  const w = 700, h = 260, min = Math.min(...SERIES), max = Math.max(...SERIES);
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - ((v - min) / (max - min)) * (h - 20) - 10]);
  const n = Math.max(2, Math.round(ramp(f, 20, 80) * pts.length));
  const line = pts.slice(0, n).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const paper = f > CLICK_PAPER;
  return (
    <Stage tone="dark">
      <Cam shot={TEST_CAM}>
        <div style={{position: 'absolute', left: 900, top: 150, width: 820, height: 790, borderRadius: 30, background: 'linear-gradient(150deg,#232535,#191B27 60%,#13141e)', boxShadow: darkShadow, border: '1px solid rgba(165,151,255,.18)', padding: 48, boxSizing: 'border-box', transform: tilt(f, -18), opacity: ramp(f, 0, 10)}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontFamily: F.display, fontSize: 38, letterSpacing: -1.2}}>Big Tech Core</div>
            <div style={{fontSize: 15, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 99, padding: '6px 14px'}}>Backtest · net of fees</div>
          </div>
          <svg width={w} height={h} style={{marginTop: 40, overflow: 'visible'}}>
            <defs><linearGradient id="ht-line" x1="0" x2="1"><stop offset="0" stopColor="#A597FF" /><stop offset=".7" stopColor="#EEB2CB" /><stop offset="1" stopColor="#F3CDB0" /></linearGradient></defs>
            <line x1={0} x2={w} y1={pts[0][1]} y2={pts[0][1]} stroke="rgba(244,242,238,.25)" strokeDasharray="4 6" />
            <path d={`${line}L${pts[n - 1][0]},${h}L0,${h}Z`} fill="rgba(165,151,255,.12)" />
            <path d={line} fill="none" stroke="url(#ht-line)" strokeWidth={3} strokeLinejoin="round" />
          </svg>
          <div style={{display: 'flex', gap: 14, marginTop: 34}}>
            {[['Return', '+7.1%', C.mint], ['Max drawdown', '−8.9%', C.text], ['Fees', 'Included', C.text]].map(([l, v, c], i) => (
              <div key={l} style={{flex: 1, borderRadius: 16, background: 'rgba(244,242,238,.05)', border: `1px solid ${C.line}`, padding: '16px 20px', opacity: ramp(f, 78 + i * 6, 90 + i * 6), translate: `0 ${lerp(20, 0, pop(f, 78 + i * 6))}px`}}>
                <div style={{fontSize: 16, color: C.muted}}>{l}</div><div style={{fontSize: 30, fontWeight: 600, marginTop: 6, color: c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 48, right: 48, top: 680, height: 64, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 21, fontWeight: 500, background: paper ? 'rgba(143,227,176,.14)' : C.text, color: paper ? C.mint : C.ink, border: paper ? `1.5px solid ${C.mint}` : 'none', opacity: ramp(f, 92, 102)}}>
            {paper ? <><span style={{width: 10, height: 10, borderRadius: '50%', background: C.mint, boxShadow: `0 0 0 ${3 + 3 * Math.sin(f / 5)}px rgba(143,227,176,.25)`}} />Paper trading · no real funds</> : 'Start paper trading'}
          </div>
          <div style={{position: 'absolute', left: 48, bottom: 14, fontSize: 13, color: 'rgba(244,242,238,.4)'}}>Illustrative figures · hypothetical, not a real result</div>
        </div>
        <Cursor path={[[96, 1780, 1060], [CLICK_PAPER - 4, PAPER.x, PAPER.y], [140, PAPER.x, PAPER.y]]} clicks={[CLICK_PAPER]} hideAt={132} />
      </Cam>
      <StepLabel n={3} title="Test it first" sub="Backtest on real on-chain prices, net of fees. Then paper trade it before any money moves." f={f} hide={zoom} dark />
    </Stage>
  );
};

// ---------- 5. Limits and create the vault ----------
const RULES: [string, string][] = [['Max per trade', '$500'], ['Max drawdown', '10%'], ['Allowed assets', '5 stocks'], ['Policy changes', '24h delay']];
const CREATE = {x: 1300, y: 812};
const CLICK_CREATE = 92, CLICK_CONFIRM = 132;
const CONFIRM = {x: 1518, y: 590};
const VAULT_CAM: Shot = {fs: [0, 84, 100, 116, 150, 172], s: [1, 1, 1.12, 1.3, 1.3, 1], x: [960, 960, CREATE.x, 1400, 1400, 960], y: [540, 540, CREATE.y - 80, 520, 520, 540]};

const Vault = () => {
  const f = useCurrentFrame();
  const zoom = ramp(camAt(f, VAULT_CAM).s, 1, 1.12);
  const sheet = pop(f, CLICK_CREATE + 6);
  const created = ramp(f, CLICK_CONFIRM + 6, CLICK_CONFIRM + 14);
  return (
    <Stage tone="purple">
      <Cam shot={VAULT_CAM}>
        <div style={{position: 'absolute', left: 900, top: 160, width: 800, height: 740, transform: tilt(f, 24)}}>
          {[2, 1].map((k) => <div key={k} style={{position: 'absolute', inset: 0, borderRadius: 30, background: k === 2 ? '#7566B5' : '#8d7fd0', translate: `${k * 16}px ${k * 18}px`, opacity: ramp(f, 4 + k * 3, 14 + k * 3), boxShadow: '0 20px 40px rgba(27,22,32,.18)'}} />)}
          <div style={{position: 'absolute', inset: 0, borderRadius: 30, background: C.gradient, boxShadow: 'inset 1px 2px 1px rgba(255,255,255,.55),0 14px 20px rgba(27,22,32,.2),0 42px 70px rgba(27,22,32,.2)', padding: 48, boxSizing: 'border-box', color: C.ink}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}><Logo size={40} /><div style={{fontFamily: F.display, fontSize: 38, letterSpacing: -1.2}}>Guarded vault policy</div></div>
            {RULES.map(([l, v], i) => (
              <div key={l} style={{marginTop: i ? 14 : 36, height: 74, borderRadius: 18, background: 'rgba(251,250,247,.6)', display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 22, opacity: ramp(f, 20 + i * 8, 30 + i * 8), translate: `${lerp(30, 0, pop(f, 20 + i * 8))}px 0`}}>
                <span style={{flex: 1, color: 'rgba(27,22,32,.7)'}}>{l}</span><b style={{fontWeight: 600}}>{v}</b>
                <span style={{marginLeft: 16, width: 26, height: 26, borderRadius: '50%', background: C.ink, color: C.text, display: 'grid', placeItems: 'center', fontSize: 14, scale: pop(f, 30 + i * 8)}}>✓</span>
              </div>
            ))}
            <div style={{position: 'absolute', left: 48, right: 48, top: 620, height: 68, borderRadius: 99, background: created ? C.ink : C.ink, color: created ? C.mint : C.text, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 500, scale: Math.abs(f - CLICK_CREATE) < 4 ? 0.97 : 1}}>{created ? '✓ Vault created on Robinhood Chain' : 'Create agent'}</div>
          </div>
          {sheet > 0.01 ? (
            <div style={{position: 'absolute', left: 300, top: 180, width: 440, height: 300, borderRadius: 24, background: C.surface, color: C.text, boxShadow: darkShadow, border: '1px solid rgba(165,151,255,.3)', padding: 30, boxSizing: 'border-box', opacity: sheet * (1 - created), transform: `translateZ(60px) translateY(${(1 - sheet) * 40}px) scale(${0.92 + 0.08 * sheet})`}}>
              <div style={{fontSize: 14, letterSpacing: 2, color: C.muted}}>WALLET · CONFIRM</div>
              <div style={{fontSize: 26, fontWeight: 600, marginTop: 10}}>Create GuardedVault</div>
              <div style={{fontSize: 16, color: C.muted, marginTop: 10, lineHeight: 1.5}}>Network: Robinhood Chain<br />Funds stay in a vault you own</div>
              <div style={{position: 'absolute', left: 30, right: 30, bottom: 28, display: 'flex', gap: 12}}>
                <div style={{flex: 1, height: 52, borderRadius: 99, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontSize: 18}}>Reject</div>
                <div style={{flex: 1, height: 52, borderRadius: 99, background: C.gradient, color: C.ink, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, scale: Math.abs(f - CLICK_CONFIRM) < 4 ? 0.95 : 1}}>Confirm</div>
              </div>
            </div>
          ) : null}
        </div>
        <Cursor path={[[70, 1780, 1060], [CLICK_CREATE - 4, CREATE.x + 30, CREATE.y], [104, CREATE.x + 30, CREATE.y], [CLICK_CONFIRM - 6, CONFIRM.x, CONFIRM.y]]} clicks={[CLICK_CREATE, CLICK_CONFIRM]} hideAt={156} />
      </Cam>
      <StepLabel n={4} title="Set the limits" sub="Your vault enforces them on chain. Tightening is instant; loosening waits 24 hours." f={f} hide={zoom} />
    </Stage>
  );
};

// ---------- 6. Verify every decision (phone) ----------
const TAP = 74;
const Verify = () => {
  const f = useCurrentFrame();
  const ok = f > TAP + 6;
  const note = pop(f, 104);
  const camS = kf(f, [0, 60, 90, 160], [1, 1, 1.1, 1.14]);
  return (
    <Stage tone="cream">
      <AbsoluteFill style={{transformOrigin: '1400px 520px', scale: camS}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {[[880, 760, 1205, 520], [880, 880, 1205, 700]].map(([x1, y1, x2, y2], i) => (
            <path key={i} d={`M${x1 + 210},${y1} C${x1 + 300},${y1} ${x2 - 90},${y2} ${x2},${y2}`} fill="none" stroke="#7566B5" strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ramp(f, 40 + i * 8, 64 + i * 8)} />
          ))}
        </svg>
        {[['Anchor contract', '0xbf9f…04e0'], ['Your approval', 'Required to act']].map(([a, b], i) => (
          <div key={a} style={{position: 'absolute', left: 870, top: 726 + i * 120, width: 220, padding: '12px 16px', borderRadius: 16, background: '#FBFAF7', boxShadow: '3px 4px 0 #d8cfc3,0 14px 24px rgba(27,22,32,.12)', opacity: ramp(f, 32 + i * 8, 42 + i * 8), translate: `0 ${lerp(16, 0, pop(f, 32 + i * 8))}px`}}>
            <div style={{fontSize: 14, color: 'rgba(27,22,32,.55)'}}>{a}</div><div style={{fontSize: 18, fontWeight: 600, marginTop: 2, fontFamily: i ? F.sans : 'monospace'}}>{b}</div>
          </div>
        ))}
        <div style={{position: 'absolute', left: 1200, top: 70, scale: 0.92, transformOrigin: '0 0', transform: `perspective(1600px) rotateY(${lerp(-14, -4, pop(f, 0))}deg) rotateX(2deg)`}}>
          <Phone>
            <div style={{padding: '80px 30px', fontFamily: F.sans}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}><Logo size={30} /><span style={{fontSize: 18, color: C.muted}}>Verify</span></div>
              <div style={{fontFamily: F.display, fontSize: 40, letterSpacing: -1.2, marginTop: 30}}>Decision #0142</div>
              <div style={{fontSize: 16, color: C.muted, marginTop: 6}}>Big Tech Core · rebalance proposal</div>
              {[['Decision hash', '0x9c4e…a1f2'], ['Anchored on', 'Robinhood Chain'], ['Executed by', 'Paper mode']].map(([l, v], i) => (
                <div key={l} style={{marginTop: i ? 10 : 30, borderRadius: 16, background: C.surface, padding: '16px 18px', opacity: ramp(f, 14 + i * 6, 24 + i * 6)}}>
                  <div style={{fontSize: 14, color: C.muted}}>{l}</div><div style={{fontSize: 19, marginTop: 4, fontFamily: i ? F.sans : 'monospace'}}>{v}</div>
                </div>
              ))}
              <div style={{marginTop: 26, height: 62, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 600, background: ok ? 'rgba(143,227,176,.16)' : C.gradient, color: ok ? C.mint : C.ink, border: ok ? `1.5px solid ${C.mint}` : 'none', scale: Math.abs(f - TAP) < 4 ? 0.96 : 1}}>{ok ? '✓ Hash matches on chain' : 'Verify decision'}</div>
              <div style={{position: 'absolute', left: 240, top: 640, width: 70 * ramp(f, TAP, TAP + 14), height: 70 * ramp(f, TAP, TAP + 14), translate: '-50% -50%', borderRadius: '50%', background: 'rgba(244,242,238,.35)', opacity: 1 - ramp(f, TAP, TAP + 14)}} />
            </div>
          </Phone>
          <div style={{position: 'absolute', left: 24, right: 24, top: 60, borderRadius: 22, background: 'rgba(251,250,247,.96)', color: C.ink, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 4px 0 #d8cfc3,0 24px 40px rgba(10,11,18,.3)', opacity: note, transform: `translateY(${(1 - note) * -50}px) translateZ(40px) scale(${0.94 + 0.06 * note})`}}>
            <span style={{width: 44, height: 44, borderRadius: 12, background: C.bg, display: 'grid', placeItems: 'center'}}><Logo size={26} /></span>
            <div><div style={{fontSize: 17, fontWeight: 600}}>Decision anchored</div><div style={{fontSize: 15, color: 'rgba(27,22,32,.6)'}}>Review it before anything executes.</div></div>
          </div>
        </div>
      </AbsoluteFill>
      <StepLabel n={5} title="Check every move" sub="Each agent decision is hashed and anchored on Robinhood Chain. Anyone can verify it." f={f} />
    </Stage>
  );
};

// ---------- 7. Statement, 8. Brand ----------
const Statement = () => {
  const f = useCurrentFrame();
  return (
    <Stage tone="purple">
      <AbsoluteFill style={{display: 'grid', placeItems: 'center', scale: lerp(0.97, 1.04, ramp(f, 0, 90))}}>
        <div style={{fontFamily: F.display, fontSize: 160, letterSpacing: -7, lineHeight: 1.02, textAlign: 'center', color: C.ink, textShadow: '0 4px 8px rgba(27,22,32,.08),0 24px 48px rgba(27,22,32,.14)'}}>
          <RevealText text="Your rules." start={4} step={1.4} /><br />
          <i style={{fontFamily: F.italic, letterSpacing: -3}}><RevealText text="Verifiable moves." start={22} step={1.2} /></i>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
const End = () => {
  const f = useCurrentFrame();
  return (
    <Stage tone="dark">
      <AbsoluteFill style={{display: 'grid', placeItems: 'center', alignContent: 'center', gap: 40, scale: lerp(0.9, 1.04, ramp(f, 0, 100))}}>
        <div style={{filter: 'drop-shadow(0 22px 24px rgba(165,151,255,.22))'}}><Brand size={150} /></div>
        <div style={{textAlign: 'center', opacity: ramp(f, 26, 40), translate: `0 ${lerp(16, 0, pop(f, 26))}px`}}>
          <div style={{fontSize: 40, fontWeight: 500}}>usesiro.xyz</div>
          <div style={{fontSize: 22, color: C.muted, marginTop: 12}}>Live on Robinhood Chain mainnet · Investing involves risk</div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// ---------- audio ----------
type Cue = {name: string; at: number; d: number; sound: string; gain: number};
const ui = (scene: number, at: number, sound: string, gain: number, name: string, d = 10): Cue => ({name, at: ST[scene] + at, d, sound, gain});
const CUES: Cue[] = [
  {name: 'Title', at: 4, d: 6, sound: 'tick', gain: 0.2},
  ...[0, 1, 2, 3, 4].map((i): Cue => ({name: `Deal card ${i + 1}`, at: DEAL(i), d: 12, sound: 'card', gain: 0.22 + i * 0.02})),
  {name: 'Push into step 1', at: 80, d: 25, sound: 'recede', gain: 0.3},
  ...TR.map((t, i): Cue => ({name: `Transition ${i + 1} / ${t.mode}`, at: ST[i + 1], d: t.d, sound: t.sound, gain: 0.6})),
  ui(1, 8, 'card', 0.3, 'Laptop settles', 12),
  ui(1, CLICK_BTN, 'click', 0.45, 'Click connect', 8),
  ui(1, CLICK_BTN + 8, 'card', 0.3, 'Wallet modal', 12),
  ...[0, 1, 2].map((i) => ui(1, CLICK_BTN + 14 + i * 4, 'tick', 0.14, `Wallet ${i + 1}`, 6)),
  ui(1, CLICK_WALLET, 'click', 0.45, 'Click MetaMask', 8),
  ui(1, CLICK_WALLET + 10, 'confirm', 0.55, 'Connected', 22),
  ui(2, 6, 'card', 0.3, 'Studio card', 12),
  ...PICKS.map((_i, k) => ui(2, PICK_AT(k), 'click', 0.3, `Pick ${k + 1}`, 8)),
  ui(2, CLICK_RUN, 'click', 0.45, 'Run backtest', 8),
  ui(3, 22, 'sparkle', 0.28, 'Chart draws', 20),
  ...[0, 1, 2].map((i) => ui(3, 78 + i * 6, 'tick', 0.15, `Stat ${i + 1}`, 6)),
  ui(3, CLICK_PAPER, 'click', 0.45, 'Start paper', 8),
  ui(3, CLICK_PAPER + 4, 'confirm', 0.4, 'Paper on', 20),
  ...RULES.map((_r, i) => ui(4, 28 + i * 8, 'tick', 0.16, `Rule ${i + 1}`, 6)),
  ui(4, CLICK_CREATE, 'click', 0.45, 'Create agent', 8),
  ui(4, CLICK_CREATE + 6, 'card', 0.32, 'Wallet sheet', 12),
  ui(4, CLICK_CONFIRM, 'click', 0.45, 'Confirm', 8),
  ui(4, CLICK_CONFIRM + 8, 'confirm', 0.6, 'Vault created', 22),
  ...[0, 1].map((i) => ui(5, 34 + i * 8, 'tick', 0.15, `Badge ${i + 1}`, 6)),
  ui(5, TAP, 'click', 0.4, 'Tap verify', 8),
  ui(5, TAP + 6, 'confirm', 0.45, 'Hash matches', 20),
  ui(5, 104, 'notification', 0.5, 'Notification lands', 24),
  ui(6, 4, 'tick', 0.2, 'Statement', 6),
  ui(7, 6, 'confirm', 0.4, 'Brand resolves', 22),
];
const Music = () => {
  const f = useCurrentFrame();
  const env = interpolate(f, [0, 18, HOWTO_FRAMES - 42, HOWTO_FRAMES], [0, 0.55, 0.55, 0], clamp);
  const duck = CUES.filter((c) => c.gain >= 0.45).reduce((m, c) => Math.min(m, interpolate(f, [c.at - 5, c.at + 2, c.at + c.d, c.at + c.d + 9], [1, 0.8, 0.8, 1], clamp)), 1);
  return <Audio name="Music bed" src={staticFile('audio/designed/hazy-after-hours.mp3')} volume={env * duck} />;
};
const Sfx = ({c}: {c: Cue}) => {
  const f = useCurrentFrame();
  const fade = Math.min(5, Math.floor(c.d / 3));
  return <Audio src={staticFile(`audio/designed/${c.sound}.wav`)} volume={interpolate(f, [0, 1, c.d - fade, c.d], [0, c.gain, c.gain, 0], clamp)} />;
};

// ---------- film ----------
const SCENES: [string, React.FC][] = [['01 / Intro', Intro], ['02 / Connect wallet', Connect], ['03 / Write the plan', Strategy], ['04 / Test it first', Backtest], ['05 / Set the limits', Vault], ['06 / Check every move', Verify], ['07 / Statement', Statement], ['08 / Siro', End]];

export const HowTo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <TransitionSeries>
      {SCENES.flatMap(([name, Scene], i) => [
        <TransitionSeries.Sequence key={name} name={name} durationInFrames={SH[i]}><Scene /></TransitionSeries.Sequence>,
        ...(i < TR.length ? [<TransitionSeries.Transition key={`t${i}`} presentation={{component: DepthTransition, props: {mode: TR[i].mode, direction: TR[i].dir ?? 1}}} timing={linearTiming({durationInFrames: TR[i].d, easing: Easing.bezier(0.25, 0.1, 0.75, 0.9)})} />] : []),
      ])}
    </TransitionSeries>
    <Music />
    {CUES.map((c) => <Sequence key={c.name} name={c.name} from={c.at} durationInFrames={c.d} layout="none"><Sfx c={c} /></Sequence>)}
  </AbsoluteFill>
);
