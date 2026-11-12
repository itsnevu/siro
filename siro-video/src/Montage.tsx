import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { C, F } from "./theme";
import { Brand, Logo, clamp } from "./components/Siro";
import { Soundtrack } from "./components/Soundtrack";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { DepthTransition } from "./components/DepthTransition";
import { SHOTS, TRANSITIONS, INTRO_OVERLAP, STRATEGY_OVERLAP } from "./timing";
import {RevealText} from './components/RevealText';

const pop = (f: number, d = 0) =>
  spring({
    frame: f - d,
    fps: 30,
    config: { damping: 24, stiffness: 100, mass: 1.1 },
  });
const ramp = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], clamp);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const light = C.cream;
const Stage: React.FC<
  React.PropsWithChildren<{ dark?: boolean; purple?: boolean }>
> = ({ children, dark = false, purple = false }) => {
  const f=useCurrentFrame();
  // Keep camera velocity through the hold; object entrances remain independent.
  const drift=interpolate(f,[0,150],[0,1],clamp);
  return (
  <AbsoluteFill
    style={{
      background: dark ? C.bg : purple ? C.purple : light,
      color: dark ? C.text : C.ink,
      fontFamily: F.sans,
      overflow: "hidden",
    }}
  >
    <AbsoluteFill style={{scale:1+drift*.035,translate:`${-drift*10}px ${-drift*6}px`,transformOrigin:'50% 50%'}}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
};

const Coin = ({
  size = 400,
  rotation = 0,
}: {
  size?: number;
  rotation?: number;
}) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      transform: `perspective(1800px) rotateY(${rotation}deg) rotateZ(-16deg)`,
      transformStyle: "preserve-3d",
    }}
  >
    {[12, 8, 4, 0].map((z) => (
      <div
        key={z}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          transform: `translateZ(${-z}px)`,
          background: z ? "#7566B5" : C.gradient,
          border: "2px solid rgba(244,242,238,.25)",
          boxShadow:
            z === 0
              ? "inset 8px 12px 18px rgba(244,242,238,.22),inset -9px -12px 22px rgba(27,22,32,.2),0 35px 75px rgba(10,11,18,.25)"
              : undefined,
          display: "grid",
          placeItems: "center",
          backfaceVisibility: z === 0 ? "hidden" : "visible",
        }}
      >
        {z === 0 ? (
          <div style={{ filter: "brightness(0)", opacity: 0.84 }}>
            <Logo size={size * 0.5} />
          </div>
        ) : null}
      </div>
    ))}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        transform: "translateZ(-14px) rotateY(180deg)",
        backfaceVisibility: "hidden",
        background: C.gradient,
        border: "2px solid rgba(244,242,238,.25)",
        display: "grid",
        placeItems: "center",
        boxShadow: "inset 8px 12px 18px rgba(244,242,238,.22)",
      }}
    >
      <div style={{ filter: "brightness(0)", opacity: 0.84 }}>
        <Logo size={size * 0.5} />
      </div>
    </div>
  </div>
);

const Allocation = ({
  progress = 1,
  size = 250,
  logoOpacity = 1,
}: {
  progress?: number;
  size?: number;
  logoOpacity?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `conic-gradient(${C.purple} 0deg ${144 * progress}deg,${C.pink} ${144 * progress}deg ${270 * progress}deg,${C.peach} ${270 * progress}deg ${360 * progress}deg,${C.surface} ${360 * progress}deg)`,
      padding: 18,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: C.bg,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{opacity: logoOpacity}}><Logo size={size * 0.3} /></div>
    </div>
  </div>
);

const Phone: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties; landing?: boolean }>
> = ({ children, style, landing = false }) => (
  <div
    style={{
      width: 480,
      height: 930,
      boxSizing: "border-box",
      borderRadius: 68,
      padding: 13,
      background:
        "linear-gradient(140deg,#676570,#0A0B12 35%,#4c4b55 80%,#0A0B12)",
      boxShadow: "inset 2px 2px 3px rgba(255,255,255,.4),12px 12px 0 #24232d,24px 42px 48px rgba(10,11,18,.23),45px 75px 115px rgba(10,11,18,.19)",
      position: "relative",
      transformStyle: "preserve-3d",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 68,
        background: "#34333f",
        transform: "translateZ(-14px)",
        boxShadow: "8px 7px 0 #22212b,10px 9px 0 #11121b",
      }}
    />
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 55,
        overflow: landing ? "visible" : "hidden",
        position: "relative",
        background: C.bg,
        color: C.text,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          translate: "-50% 0",
          width: 130,
          height: 32,
          borderRadius: 99,
          background: "#000",
          zIndex: 10,
        }}
      />
      {children}
    </div>
  </div>
);

const Portfolio = ({
  f = 100,
  interactive = false,
  landing = false,
  openingFrame,
}: {
  f?: number;
  interactive?: boolean;
  landing?: boolean;
  openingFrame?: number;
}) => (
  <div style={{ padding: "80px 30px 30px" }}>
    <Brand size={30} />
    <div
      style={{
        fontFamily: F.display,
        fontSize: 36,
        letterSpacing: -1,
        marginTop: 35,
      }}
    >
      DCA into NVDA
    </div>
    <div style={{ fontSize: 15, color: C.muted, marginTop: 10 }}>
      Paper mode
    </div>
    <div
      style={{ position: "relative", display: "flex", justifyContent: "center", margin: "35px 0" }}
    >
      <Allocation size={280} progress={Math.min(pop(f, 8), 1)} logoOpacity={landing ? ramp(f, 24, 44) : 1} />
      {openingFrame !== undefined && openingFrame < 96 ? <OpeningCoin frame={openingFrame}/> : null}
    </div>
    {["NVDA", "AAPL", "TSLA"].map((t, i) => (
      <div
        key={t}
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "23px 12px",
          borderRadius: 8,
          background:
            interactive && f > 28 && i === 0
              ? "rgba(165,151,255,.12)"
              : undefined,
          borderBottom: `1px solid ${C.line}`,
          fontSize: 22,
        }}
      >
        <span>{t}</span>
        <span style={{ color: [C.purple, C.pink, C.peach][i] }}>
          {[40, 35, 25][i]}%
        </span>
      </div>
    ))}
    {interactive && f >= 22 && f < 44 ? (
      <div
        style={{
          position: "absolute",
          left: 332,
          top: 589,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: `2px solid ${C.purple}`,
          background: "rgba(165,151,255,.12)",
          scale: lerp(0.4, 1.5, ramp(f, 22, 44)),
          opacity: 1 - ramp(f, 22, 44),
          pointerEvents: "none",
        }}
      />
    ) : null}
  </div>
);

const Notification = () => (
  <div
    style={{
      padding: "26px 30px",
      borderRadius: 26,
      background:
        "linear-gradient(120deg,rgba(244,242,238,.95),rgba(233,225,214,.91))",
      color: C.ink,
      display: "flex",
      alignItems: "center",
      gap: 24,
      boxShadow: "0 15px 45px rgba(0,0,0,.15)",
    }}
  >
    <div
      style={{
        background: C.gradient,
        width: 76,
        height: 76,
        borderRadius: 20,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ filter: "brightness(0)", opacity: 0.85 }}>
        <Logo size={42} />
      </div>
    </div>
    <div>
      <div style={{ fontWeight: 600, fontSize: 25 }}>
        Siro{" "}
        <span style={{ fontWeight: 400, fontSize: 19, opacity: 0.5 }}>
          {" "}
          · Paper mode
        </span>
      </div>
      <div style={{ fontSize: 25, marginTop: 8 }}>
        Strategy ready for review.
      </div>
    </div>
    <div
      style={{
        marginLeft: "auto",
        fontSize: 17,
        opacity: 0.5,
        alignSelf: "flex-start",
      }}
    >
      Now
    </div>
  </div>
);


// One physical coin remains mounted through the entire opening.
const OpeningCoin = ({frame:f}: {frame:number}) => {
 const grow=interpolate(f,[12,44],[0,1],{...clamp,easing:Easing.bezier(.45,0,.55,1)});
 const land=interpolate(f,[44,82],[0,1],{...clamp,easing:Easing.bezier(.4,0,.2,1)});
 return <div style={{position:'absolute',visibility:'visible',zIndex:30,left:'50%',top:'50%',translate:'-50% -50%',scale:lerp(lerp(.85,5.2,grow),.42,land),opacity:1-interpolate(f,[80,96],[0,1],{...clamp,easing:Easing.bezier(.4,0,.2,1)}),transform:'translateZ(1px)'}}><Coin size={400} rotation={lerp(lerp(-26,20,grow),16,land)}/></div>;
};
const Opening = () => {
 const f=useCurrentFrame();
 const camera=interpolate(f,[44,82],[0,1],{...clamp,easing:Easing.bezier(.4,0,.2,1)});
 const orbit=interpolate(f,[76,142],[0,1],{...clamp,easing:Easing.bezier(.25,0,.75,1)});
 const phoneStyle:React.CSSProperties={position:'absolute',left:720,top:75,translate:`0 ${lerp(80,0,camera)}px`,scale:1+orbit*.015,transform:`perspective(1800px) rotateY(${lerp(-8,3,camera)-orbit*4}deg) rotateX(${lerp(5,-1,camera)}deg)`};
 return <Stage dark>
  <AbsoluteFill style={{background:C.cream,opacity:interpolate(f,[38,68],[0,1],{...clamp,easing:Easing.bezier(.4,0,.2,1)})}}/>
  <div style={{...phoneStyle,opacity:interpolate(f,[46,72],[0,1],{...clamp,easing:Easing.bezier(.4,0,.2,1)})}}><Phone><Portfolio f={f-46} landing/></Phone></div>
  <div aria-hidden style={{...phoneStyle,visibility:'hidden',pointerEvents:'none'}}><Phone landing style={{visibility:'hidden'}}><Portfolio f={f-46} openingFrame={f}/></Phone></div>
 </Stage>;
};
const NotificationMacro = () => {
  const f = useCurrentFrame();
  const checked = ramp(f, 18, 40);
  return (
    <Stage purple>
      <AbsoluteFill style={{background:'radial-gradient(ellipse at 74% 30%,rgba(243,205,176,.55),transparent 60%),radial-gradient(ellipse at 15% 90%,rgba(27,22,32,.22),transparent 65%)'}}/>
      <div style={{position:'absolute',left:120,top:285,width:650,fontFamily:F.display,fontSize:106,lineHeight:1.08,letterSpacing:-5,scale:lerp(.9,1,ramp(f,0,65)),transformOrigin:'left center',textShadow:'0 16px 30px rgba(27,22,32,.18)'}}>
        Every move.<br/><span style={{fontFamily:F.italic,fontStyle:'italic'}}>Within your rules.</span>
      </div>
      <div style={{position:'absolute',left:155,top:665,transform:`perspective(1400px) rotateY(${lerp(-28,-12,pop(f,3))}deg) rotateX(12deg)`,scale:lerp(.6,1,pop(f,3))}}><Coin size={210} rotation={f*.35}/></div>
      <div style={{position:'absolute',left:425,top:730,fontSize:25,lineHeight:1.6,opacity:ramp(f,12,28)}}>Your strategy.<br/><span style={{opacity:.6}}>Checked before execution.</span></div>
      <div style={{position:'absolute',left:875,top:235,width:860,height:620,transform:`perspective(1800px) rotateY(${lerp(-18,-6,pop(f))+Math.sin(f/36)*5}deg) rotateX(${lerp(14,4,pop(f))+Math.sin(f/44)*3}deg)`,translate:`0 ${lerp(80,0,pop(f))-Math.sin(f/38)*8}px`,scale:lerp(.9,1,pop(f))}}>
        {[2,1].map(i=><div key={i} style={{position:'absolute',inset:0,borderRadius:38,background:i===2?'#7063ac':'#c0a7df',transform:`translate3d(${i*14}px,${i*18}px,${-i*18}px) rotate(${i*1.5}deg)`,boxShadow:'0 22px 48px rgba(27,22,32,.16)'}}/>)}
        <div style={{position:'absolute',inset:0,borderRadius:38,padding:48,background:'linear-gradient(135deg,#f4eee9,#e6dce9)',boxShadow:'inset 1px 2px 2px rgba(255,255,255,.8),0 40px 90px rgba(27,22,32,.24)',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><Brand size={30}/><span style={{fontSize:18,letterSpacing:2,opacity:.55}}>PRE-TRADE CHECK</span></div>
          <div style={{fontFamily:F.display,fontSize:58,letterSpacing:-2,marginTop:38}}>Momentum Swing</div>
          <div style={{display:'flex',gap:12,marginTop:20}}>{['NVDA','AAPL','TSLA'].map((ticker,i)=><div key={ticker} style={{padding:'10px 20px',borderRadius:13,background:'rgba(27,22,32,.06)',fontSize:20,opacity:ramp(f,7+i*4,17+i*4),translate:`0 ${lerp(14,0,pop(f,7+i*4))}px`}}>{ticker}</div>)}</div>
          <div style={{marginTop:32,display:'flex',gap:18}}>{[['Trade cap','$500'],['Max drawdown','8%']].map(([label,value],i)=><div key={label} style={{flex:1,padding:24,borderRadius:22,background:'rgba(255,255,255,.6)',opacity:ramp(f,12+i*5,25+i*5),translate:`0 ${lerp(25,0,pop(f,12+i*5))}px`}}><div style={{fontSize:18,opacity:.6}}>{label}</div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:F.display,fontSize:46,marginTop:10}}>{value}<span style={{fontFamily:F.sans,fontSize:24,color:'#35714b',opacity:ramp(f,24+i*5,34+i*5)}}>✓</span></div></div>)}</div>
          <div style={{marginTop:28,padding:'22px 26px',borderRadius:20,background:C.bg,color:C.text,display:'flex',alignItems:'center',gap:18,boxShadow:'0 12px 24px rgba(27,22,32,.16)'}}><span style={{width:38,height:38,borderRadius:99,background:C.mint,color:C.ink,display:'grid',placeItems:'center',scale:lerp(.5,1,pop(f,28)),opacity:checked}}>✓</span><span style={{fontSize:27}}>{f<28?'Checking your policy…':'Policy checked.'}</span><span style={{marginLeft:'auto',fontSize:18,color:C.mint,opacity:checked}}>Within limits</span></div>
        </div>
      </div>
    </Stage>
  );
};

const TypeCut = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          fontFamily: F.display,
          fontSize: 148,
          letterSpacing: -7,
          scale: lerp(0.82, 1.08, ramp(f, 0, 80)),
          transform: `perspective(1600px) rotateY(${lerp(-12,5,ramp(f,0,80))}deg) rotateZ(${lerp(-2,1,ramp(f,0,80))}deg)`,
          textShadow: "2px 3px 0 rgba(27,22,32,.18),5px 8px 0 rgba(27,22,32,.09),12px 28px 30px rgba(27,22,32,.25)",
        }}
      >
        <RevealText text="Your" start={4}/>{" "}
        <span
          style={{ fontFamily: F.italic, fontStyle: "italic", color: C.ink }}
        >
          <RevealText text="rules." start={9}/>
        </span>
      </div>
    </Stage>
  );
};
const AssetBurst = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      <svg viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}}>
        <defs>
          <linearGradient id="asset-flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.purple}/><stop offset="55%" stopColor={C.pink}/><stop offset="100%" stopColor={C.peach}/>
          </linearGradient>
          <filter id="asset-halo" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        {[0,1,2].map(i=>{
          const y=350+i*185;
          const anchor=440+i*100;
          const reveal=interpolate(f,[10+i*5,38+i*5],[0,1],{...clamp,easing:Easing.bezier(.22,1,.36,1)});
          return <g key={i} opacity={ramp(f,8+i*5,20+i*5)}>
            {[false,true].map(right=>{
              const d=right?`M 1295 ${anchor} C 1415 ${anchor}, 1370 ${y}, 1488 ${y}`:`M 432 ${y} C 550 ${y}, 505 ${anchor}, 625 ${anchor}`;
              return <g key={String(right)}>
                <path d={d} fill="none" stroke="url(#asset-flow)" strokeWidth="9" opacity=".2" filter="url(#asset-halo)" pathLength="1" strokeDasharray="1" strokeDashoffset={1-reveal}/>
                <path d={d} fill="none" stroke="url(#asset-flow)" strokeWidth="2.5" strokeLinecap="round" opacity=".65" pathLength="1" strokeDasharray="1" strokeDashoffset={1-reveal}/>
                <path d={d} fill="none" stroke={C.text} strokeWidth="3" strokeLinecap="round" opacity={reveal*.65} pathLength="1" strokeDasharray=".035 .965" strokeDashoffset={-((f-10-i*5)/85%1)}/>
                <circle cx={right?1488:432} cy={y} r="4" fill={right?C.peach:C.purple} opacity={reveal}/>
              </g>;
            })}
          </g>;
        })}
      </svg>
      {[
        "NVDA · 40%",
        "AAPL · 35%",
        "TSLA · 25%",
        "Policy checked",
        "Paper mode",
        "Ready for review",
      ].map((s, i) => {
        const d = pop(f, 5 + i * 2);
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: i < 3 ? 290 : 1630,
              top: 350 + (i % 3) * 185,
              translate: `calc(-50% + ${lerp(i < 3 ? -65 : 65, 0, d)}px) -50%`,
              width: 280,
              height: 78,
              borderRadius: 20,
              border: `1px solid ${C.line}`,
              background: C.surface,
              color: C.text,
              display: "grid",
              placeItems: "center",
              fontSize: 26,
              opacity: ramp(f, 3 + i * 2, 12 + i * 2),
              transform: `perspective(1400px) rotateY(${lerp(i<3?48:-48,i<3?10:-10,d)+Math.sin(f/35+i)*5}deg) rotateX(${lerp(22,3,d)}deg) rotateZ(${lerp(i<3?-8:8,0,d)}deg)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.13),0 4px 0 #0f1019,0 8px 12px rgba(0,0,0,.35),0 24px 45px rgba(0,0,0,.22)",
            }}
          >
            {s}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540,
          translate: "-50% -50%",
          width: 670,
          boxSizing: "border-box",
          padding: 55,
          borderRadius: 34,
          background: C.gradient,
          color: C.ink,
          boxShadow: "inset 1px 2px 1px rgba(255,255,255,.6),4px 5px 0 #9b80b4,8px 10px 0 #79618e,0 14px 20px rgba(0,0,0,.3),0 42px 70px rgba(0,0,0,.25),0 65px 110px rgba(165,151,255,.09)",
          scale: lerp(0.92, 1, pop(f)),
          transform: `perspective(1500px) rotateY(${lerp(-38,-6,pop(f))+Math.sin(f/36)*7}deg) rotateX(${lerp(24,5,pop(f))+Math.sin(f/45)*3}deg) rotateZ(${lerp(-9,0,pop(f))}deg)`,
        }}
      >
        <Brand size={38} />
        <div
          style={{
            fontFamily: F.display,
            fontSize: 76,
            marginTop: 40,
            letterSpacing: -4,
          }}
        >
          <RevealText text="Top 5 Tech" start={12}/>
        </div>
        <div style={{ marginTop: 25, fontSize: 23 }}>
          <RevealText text="One sentence. One vault. Onchain." start={24} step={.65}/>
        </div>
      </div>
    </Stage>
  );
};
const Laptop = ({f}: {f:number}) => <div style={{width:1000,position:'relative',transformStyle:'preserve-3d'}}>
  <div style={{height:640,padding:18,borderRadius:30,background:'linear-gradient(130deg,#b7b4bd,#474550 40%,#918e99)',boxShadow:'inset 1px 2px 1px rgba(255,255,255,.8),5px 8px 0 #4c4956,0 18px 25px rgba(27,22,32,.2),0 55px 95px rgba(27,22,32,.2)'}}>
    <div style={{height:'100%',borderRadius:18,background:C.bg,color:C.text,overflow:'hidden',position:'relative'}}>
      <div style={{position:'absolute',top:0,left:'43%',width:'14%',height:22,borderRadius:'0 0 9px 9px',background:'#15131b'}}/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'40px 36px 24px'}}><Brand size={28}/><span style={{fontSize:18,color:C.muted}}>Agent Studio</span><span style={{fontSize:16,color:C.mint}}>● Paper mode</span></div>
      <div style={{display:'flex',gap:45,padding:'24px 40px'}}>
        <div style={{width:300}}><div style={{fontFamily:F.display,fontSize:37,letterSpacing:-1,marginBottom:28}}><RevealText text="Top 5 Tech" start={12}/></div><Allocation size={280} progress={Math.min(1,pop(f,18))}/><div style={{fontSize:16,color:C.muted,textAlign:'center',marginTop:25}}>Target allocation</div></div>
        <div style={{flex:1,paddingTop:8}}><div style={{fontSize:18,color:C.muted,marginBottom:26}}>Equal-weight · 5 assets</div>{['AAPL','MSFT','GOOGL','AMZN','NVDA'].map((ticker,i)=><div key={ticker} style={{padding:'14px 22px',marginBottom:8,borderRadius:14,background:C.surface,opacity:ramp(f,18+i*4,28+i*4),translate:`0 ${lerp(22,0,pop(f,18+i*4))}px`}}><div style={{display:'flex',justifyContent:'space-between',fontSize:20}}><span>{ticker}</span><span style={{color:[C.purple,C.pink,C.peach,C.mint,'#F4F2EE'][i]}}>20%</span></div><div style={{height:4,borderRadius:5,marginTop:12,background:'rgba(255,255,255,.06)'}}><div style={{height:4,borderRadius:5,width:`${100*ramp(f,22+i*4,48+i*4)}%`,background:[C.purple,C.pink,C.peach,C.mint,'#F4F2EE'][i]}}/></div></div>)}<div style={{fontSize:17,color:C.mint,marginTop:18,opacity:ramp(f,38,50)}}>✓ All limits passed · Ready to deploy</div></div>
      </div>
    </div>
  </div>
  <div style={{position:'relative',left:-65,width:1130,height:38,borderRadius:'3px 3px 45px 45px',background:'linear-gradient(#e1dee5,#9995a3 35%,#5f5a6b)',boxShadow:'0 8px 5px rgba(27,22,32,.2),0 35px 45px rgba(27,22,32,.18)',transform:'rotateX(28deg)',transformOrigin:'center top'}}><div style={{margin:'0 auto',width:170,height:12,borderRadius:'0 0 16px 16px',background:'#827d8d'}}/></div>
</div>;
const Dial = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 800,
          top: 235,
          scale: lerp(1.025, 1, pop(f)),
          translate: `0 ${lerp(45, 0, pop(f))}px`,
          transform: `perspective(1800px) rotateY(${lerp(38,-8,pop(f))+Math.sin(f/38)*7}deg) rotateX(${3+Math.sin(f/45)*4}deg) rotateZ(${Math.sin(f/42)*2}deg)`,
        }}
      >
        <Laptop f={f}/>
      </div>
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 380,
          fontFamily: F.display,
          fontSize: 86,
          lineHeight: 1.12,
          letterSpacing: -4,
          opacity: ramp(f, 9, 20),
        }}
      >
        <RevealText text="Built" start={10}/>
        <br />
        <RevealText text="around you." start={16}/>
      </div>
    </Stage>
  );
};
const GuardMacro = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          left: 260,
          top: 210,
          fontFamily: F.display,
          fontSize: 100,
          letterSpacing: -4,
        }}
      >
        Always{" "}
        <span
          style={{ fontFamily: F.italic, fontStyle: "italic", color: C.purple }}
        >
          within limits.
        </span>
      </div>
      <div style={{ position: "absolute", left: 260, top: 430, width: 1400 }}>
        {[
          ["Trade cap", "$500"],
          ["Max drawdown", "8%"],
        ].map(([a, b], i) => (
          <div
            key={a}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "36px 45px",
              background: i ? C.gradient : C.surface,
              color: i ? C.ink : C.text,
              borderRadius: 22,
              marginBottom: 24,
              fontSize: 44,
              translate: `0 ${lerp(45, 0, pop(f, i * 5))}px`,
              opacity: ramp(f, i * 5, i * 5 + 8),
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.2),0 5px 0 #413348,0 10px 16px rgba(0,0,0,.3),0 32px 60px rgba(0,0,0,.22)",
              transform: `perspective(1800px) rotateX(${lerp(-30,3,pop(f,i*5))}deg) rotateY(${(i?1:-1)*(7+Math.sin(f/32)*4)}deg) rotateZ(${lerp(i?6:-6,0,pop(f,i*5))}deg)`,
            }}
          >
            <span>{a}</span>
            <span style={{ display: "flex", gap: 32, alignItems: "center" }}>
              {b}
              <span style={{ color: i ? C.ink : C.mint }}>✓</span>
            </span>
          </div>
        ))}
      </div>
    </Stage>
  );
};
const PhoneNotification = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 210,
          top: 330,
          fontFamily: F.display,
          fontSize: 84,
          lineHeight: 1.12,
          letterSpacing: -4,
        }}
      >
        <RevealText text="Ready for" start={8}/>
        <br />
        <RevealText text="your review." start={18}/>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1050,
          top: 245,
          scale: lerp(1.35,1.5,ramp(f,0,100)),
          transformOrigin: '50% 0%',
          transform: `perspective(1800px) rotateY(${lerp(-10,4,ramp(f,0,70))}deg) rotateX(-2deg)`,
          translate: `0 ${lerp(45, 0, pop(f))}px`,
        }}
      >
        <Phone>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(145deg,#191B27,#0A0B12 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 155,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 76,
              letterSpacing: -3,
            }}
          >
            09:41
          </div>
          <div
            style={{
              position: "absolute",
              top: 265,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 19,
              color: C.muted,
            }}
          >
            Your next move, on your terms.
          </div>
          <div
            style={{ position: "absolute", top: 420, left: 127, opacity: 0.18 }}
          >
            <Logo size={200} />
          </div>
        </Phone>
      </div>
      <div
        style={{
          position: "absolute",
          left: 580,
          top: 705,
          width: 1070,
          scale: lerp(0.94, 1, pop(f, 6))+ramp(f,20,110)*.035,
          translate: `0 ${lerp(45, 0, pop(f, 6))-Math.sin(f/38)*9}px`,
          opacity: ramp(f, 5, 13),
          transform: `perspective(1800px) translateZ(45px) rotateX(${lerp(18,-2,pop(f,6))+Math.sin(f/42)*3}deg) rotateY(${-3+Math.sin(f/38)*4}deg)`,
        }}
      >
        <Notification />
      </div>
    </Stage>
  );
};
const Collage = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 304 + (i % 3) * 456,
            top: 108 + Math.floor(i / 3) * 464,
            translate: `0 ${Math.sin(f / 40 + i) * 8}px`,
            width: 400,
            height: 400,
            borderRadius: "50%",
            overflow: "hidden",
            background: i === 1 ? C.gradient : C.bg,
            color: C.text,
            scale: lerp(0.9, 1, pop(f, i * 2))+Math.sin(f/42+i)*.018,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `perspective(1500px) rotateY(${lerp(i%2?35:-35,0,pop(f,i*2))+Math.sin(f/38+i)*13}deg) rotateX(${Math.cos(f/42+i)*9}deg) rotateZ(${Math.sin(f/50+i)*3}deg)`,
            boxShadow: `inset 2px 3px 3px rgba(255,255,255,.15),4px 6px 0 ${i===1?'#9c81b7':'#24212d'},${Math.sin(f/38+i)*8}px 12px 14px rgba(10,11,18,.14),0 32px 50px rgba(10,11,18,.14)`,
          }}
        >
          {i === 0 ? (
            <Allocation size={280} />
          ) : i === 1 ? (
            <div style={{ filter: "brightness(0)", opacity: 0.85 }}>
              <Logo size={190} />
            </div>
          ) : i === 2 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, color: C.mint }}>✓</div>
              <div
                style={{ fontFamily: F.display, fontSize: 36, marginTop: 20 }}
              >
                Ready for
                <br />
                review.
              </div>
            </div>
          ) : i === 3 ? (
            <div style={{ width: 235 }}>
              {["NVDA", "AAPL", "TSLA"].map((t, j) => (
                <div
                  key={t}
                  style={{
                    fontSize: 26,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "20px 0",
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  <span>{t}</span>
                  <span style={{ color: [C.purple, C.pink, C.peach][j] }}>
                    {[40, 35, 25][j]}%
                  </span>
                </div>
              ))}
            </div>
          ) : i === 4 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, color: C.muted }}>Trade cap</div>
              <div
                style={{ fontFamily: F.display, fontSize: 76, marginTop: 18 }}
              >
                $500
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, color: C.mint }}>● Paper mode</div>
              <div
                style={{ fontFamily: F.display, fontSize: 38, marginTop: 28 }}
              >
                Your rules.
                <br />
                Always.
              </div>
            </div>
          )}
        </div>
      ))}
    </Stage>
  );
};
const MotionCut = () => {
  const f = useCurrentFrame();
  return (
    <Stage purple>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.italic,
          fontStyle: "italic",
          fontSize: 170,
          letterSpacing: -5,
          scale: lerp(0.78, 1.08, ramp(f, 0, 70)),
          transform: `perspective(1600px) rotateY(${lerp(-12, 3, ramp(f, 0, 70))}deg)`,
          textShadow: "2px 3px 0 rgba(27,22,32,.18),5px 8px 0 rgba(27,22,32,.09),12px 28px 30px rgba(27,22,32,.28)",
        }}
      >
        <RevealText text="In motion." start={6} step={1.8}/>
      </div>
    </Stage>
  );
};
const End = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: lerp(0.86, 1.06, ramp(f, 0, 100)),
          transform: `perspective(1800px) rotateY(${lerp(-8,3,ramp(f,0,100))}deg) rotateX(${lerp(5,-2,ramp(f,0,100))}deg)`,
          filter: "drop-shadow(0 22px 24px rgba(165,151,255,.22))",
        }}
      >
        <Brand size={160} />
      </div>
    </Stage>
  );
};

export const Montage = () => (
  <AbsoluteFill style={{ background: C.bg, perspective: 1800 }}>
    <TransitionSeries>
      <TransitionSeries.Sequence name="01–02 / Continuous coin into phone" durationInFrames={SHOTS[0]+SHOTS[1]-INTRO_OVERLAP}><Opening/></TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: 1 },
        }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[0],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence
        name="03 / Policy notification macro"
        durationInFrames={SHOTS[2]}
      >
        <NotificationMacro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "mosaic" } }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[1],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence name="04 / Your rules" durationInFrames={SHOTS[3]}>
        <TypeCut />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={{component:DepthTransition,props:{mode:'focus'}}} timing={linearTiming({durationInFrames:STRATEGY_OVERLAP,easing:Easing.bezier(.25,.1,.75,.9)})}/>
      <TransitionSeries.Sequence
        name="05 / Strategy burst"
        durationInFrames={SHOTS[4]}
      >
        <AssetBurst />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: -1 },
        }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[2],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence
        name="06 / Portfolio dial"
        durationInFrames={SHOTS[5]}
      >
        <Dial />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "lift" } }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[3],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence name="07 / Guard macro" durationInFrames={SHOTS[6]}>
        <GuardMacro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "mosaic" } }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[4],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence
        name="08 / Phone notification"
        durationInFrames={SHOTS[7]}
      >
        <PhoneNotification />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: 1 },
        }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[5],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence
        name="09 / Product collage"
        durationInFrames={SHOTS[8]}
      >
        <Collage />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "lift" } }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[6],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence name="10 / In motion" durationInFrames={SHOTS[9]}>
        <MotionCut />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "brand", direction: -1 },
        }}
        timing={linearTiming({
          durationInFrames: TRANSITIONS[7],
          easing: Easing.bezier(0.25, 0.1, 0.75, 0.9),
        })}
      />
      <TransitionSeries.Sequence name="11 / Siro" durationInFrames={SHOTS[10]}>
        <End />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Soundtrack />
  </AbsoluteFill>
);
