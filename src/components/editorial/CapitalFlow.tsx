"use client";

import {useEffect,useId,useRef,useState} from "react";
import {useInView} from "framer-motion";
import "@/styles/capital-flow.css";

const STREAMS=[
  "M-70 130C110-30 300 10 455 105S940 70 1195 175S1365 330 1440 415",
  "M-80 470C160 320 245 565 515 500S1055 535 1260 475Q1360 435 1440 415",
];
const TOKENS=[{stream:0,begin:"-1s",duration:"12s"},{stream:0,begin:"-5s",duration:"12s"},{stream:0,begin:"-9s",duration:"12s"},{stream:1,begin:"-3s",duration:"14s"},{stream:1,begin:"-10s",duration:"14s"}];

/** Decorative capital-to-wallet story. It never represents live transfers. */
export function CapitalFlow(){
  const container=useRef<HTMLDivElement>(null);
  const svg=useRef<SVGSVGElement>(null);
  const inView=useInView(container,{amount:.05});
  const [reduced,setReduced]=useState(true);
  const [pageVisible,setPageVisible]=useState(true);
  const id=`capital-${useId().replaceAll(":","")}`;
  const moving=inView&&!reduced&&pageVisible;

  useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion=()=>setReduced(preference.matches);
    const visibility=()=>setPageVisible(!document.hidden);
    motion();visibility();
    preference.addEventListener("change",motion);
    document.addEventListener("visibilitychange",visibility);
    return()=>{preference.removeEventListener("change",motion);document.removeEventListener("visibilitychange",visibility);};
  },[]);

  useEffect(()=>{
    if(moving)svg.current?.unpauseAnimations();
    else svg.current?.pauseAnimations();
  },[moving,reduced]);

  useEffect(()=>{
    const element=container.current;
    if(!element)return;
    const measure=()=>{
      const {width,height}=element.getBoundingClientRect();
      if(width>0)element.style.setProperty("--capital-token-aspect",String((height/600)/(width/1600)));
    };
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);

  return <div ref={container} className="capital-flow" aria-hidden="true" data-moving={moving?"true":"false"} data-reduced={reduced?"true":"false"}>
    <svg ref={svg} className="capital-flow-lines" viewBox="0 0 1600 600" preserveAspectRatio="none" fill="none">
      <defs>{STREAMS.map((path,i)=><path id={`${id}-${i}`} key={i} d={path}/>)}</defs>
      {STREAMS.map((_,i)=><g className={`capital-stream capital-stream-${i}`} key={i}><use href={`#${id}-${i}`} className="capital-stream-base"/><use href={`#${id}-${i}`} className="capital-stream-trace"/></g>)}
      <path className="capital-orbit" d="M1170 395C1110 220 1530 225 1550 390S1200 565 1160 460"/>
      {!reduced&&TOKENS.map((token,i)=><g className={`capital-travelling-token capital-travelling-token-${i}`} key={i}>
        <g className="capital-token-art">
        <circle cy="3" r="18" className="capital-token-edge"/>
        <circle r="18" className="capital-token-face"/>
        <circle r="13" className="capital-token-ring"/>
        <text y="6" textAnchor="middle" className="capital-token-symbol">$</text>
        </g>
        <animateMotion dur={token.duration} begin={token.begin} repeatCount="indefinite" rotate="0"><mpath href={`#${id}-${token.stream}`}/></animateMotion>
        <animate attributeName="opacity" values="0;.72;.72;0" keyTimes="0;.08;.88;1" dur={token.duration} begin={token.begin} repeatCount="indefinite"/>
      </g>)}
      {!reduced&&[0,1].map(i=><circle className={`capital-flow-dot capital-stream-${i}`} r="2.5" key={i}><animateMotion dur={i?"14s":"12s"} begin={i?"-6s":"-3s"} repeatCount="indefinite"><mpath href={`#${id}-${i}`}/></animateMotion></circle>)}
      {reduced&&<g className="capital-static-coins">{[[165,75],[330,490]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><g className="capital-token-art"><circle r="18" className="capital-token-face"/><text y="6" textAnchor="middle" className="capital-token-symbol">$</text></g></g>)}</g>}
    </svg>
    <div className="capital-wallet-anchor"><div className="capital-wallet-float"><div className="capital-wallet">
      <span className="capital-wallet-back"/>
      <span className="capital-wallet-card capital-wallet-card-back"/>
      <span className="capital-wallet-card capital-wallet-card-front"/>
      <span className="capital-wallet-face"><span className="capital-wallet-mark"/></span>
      <span className="capital-wallet-clasp"><span/></span>
      <span className="capital-wallet-receive"/>
    </div></div></div>
  </div>;
}
