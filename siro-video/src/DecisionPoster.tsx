import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from './theme';
import {Logo} from './components/Siro';

const ink = C.text;
const muted = 'rgba(244,242,238,.66)';
const rows = [
  ['01', 'Commit', 'Record a fingerprint of the decision.', 'COMMITMENT'],
  ['02', 'Reveal', 'Match the revealed decision to its commitment.', 'HASH MATCH'],
  ['03', 'Verify execution', 'Check the associated execution evidence.', 'EXECUTION'],
];

export const DecisionPoster: React.FC = () => (
  <AbsoluteFill style={{background: C.bg, color: ink, fontFamily: F.sans, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 0% 0%, rgba(165,151,255,.13), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(238,178,203,.1), transparent 50%)'}} />
    <div style={{position: 'absolute', left: 72, top: 65, display: 'flex', alignItems: 'center', gap: 16, borderRadius: 60, padding: '11px 26px 11px 12px', background: C.surface, border: `1px solid ${C.line}`, boxShadow: '0 8px 20px #00000025', fontSize: 23, fontWeight: 600}}>
      <Logo size={41}/>
      Building SIRO <span style={{opacity: .4}}>·</span> Decision verification
    </div>
    <div style={{position: 'absolute', left: 72, top: 166, fontFamily: F.display, fontSize: 96, letterSpacing: -6, lineHeight: 1.08}}>Record the decision.</div>
    <div style={{position: 'absolute', left: 72, top: 274, fontFamily: F.italic, fontStyle: 'italic', fontSize: 112, letterSpacing: -3, lineHeight: 1.06, background: C.gradient, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent'}}>Verify what followed.</div>
    <div style={{position: 'absolute', left: 73, top: 418, fontSize: 28, lineHeight: 1.5, color: muted}}>Trace what was committed, what was revealed,<br />and what actually executed.</div>
    <div style={{position: 'absolute', left: 57, right: 57, top: 552, height: 550, background: 'linear-gradient(140deg,#202030,#191B27 65%)', border: '1px solid rgba(165,151,255,.24)', borderRadius: 36, boxShadow: '0 28px 60px #00000040, inset 0 1px 0 #ffffff08', padding: '39px 44px'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 25, borderBottom: `1px solid ${C.line}`}}>
        <div style={{fontFamily: F.display, fontSize: 37, letterSpacing: -1.7}}>From decision to evidence</div>
        <div style={{fontFamily: 'monospace', fontSize: 15, letterSpacing: 1.5, color: muted}}>ILLUSTRATIVE FLOW</div>
      </div>
      {rows.map(([n, title, detail, tag]) => (
        <div key={n} style={{display: 'flex', alignItems: 'center', gap: 23, height: 112, borderBottom: `1px solid ${C.line}`}}>
          <div style={{width: 48, height: 48, flexShrink: 0, borderRadius: 15, background: 'rgba(165,151,255,.1)', border: '1px solid rgba(165,151,255,.22)', display: 'grid', placeItems: 'center', fontFamily: 'monospace', color: C.purple, fontSize: 19}}>{n}</div>
          <div style={{flex: 1}}><div style={{fontSize: 29, fontWeight: 500, letterSpacing: -.8}}>{title}</div><div style={{fontSize: 19, marginTop: 7, color: muted}}>{detail}</div></div>
          <div style={{fontFamily: 'monospace', fontSize: 13, letterSpacing: 1, color: C.purple, padding: '10px 15px', background: 'rgba(165,151,255,.08)', borderRadius: 25}}>{tag}</div>
        </div>
      ))}
      <div style={{display: 'flex', gap: 9, alignItems: 'center', color: muted, marginTop: 24, fontSize: 18}}><span style={{width: 7, height: 7, borderRadius: 5, background: C.peach}} />In testing · No mainnet decision commitments yet</div>
    </div>
    <div style={{position: 'absolute', left: 74, bottom: 35, fontFamily: F.display, fontSize: 34, letterSpacing: -1.7}}>siro.</div>
    <div style={{position: 'absolute', right: 75, bottom: 44, fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, color: muted}}>DECISIONS, MADE REVIEWABLE.</div>
  </AbsoluteFill>
);
