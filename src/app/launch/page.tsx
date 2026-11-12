"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {useAccount,useConnect} from "wagmi";
import {Header} from "@/components/Header";
import {ClassicalArtwork} from "@/components/editorial/ClassicalArtwork";
import {CinematicBackground} from "@/components/editorial/CinematicBackground";
import {CHAIN_LIST_TEXT} from "@/lib/chains";
import "@/styles/siro.css";
import "@/styles/launch-refresh.css";

function WalletIcon(){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9h18m-5 4h5v4h-5a2 2 0 010-4z" stroke="currentColor" strokeWidth="1.5"/></svg>;}

function SignInModal({onClose}:{onClose:()=>void}) {
  const {connectors,connect,isPending,error}=useConnect();
  const [available,setAvailable]=useState<string[]>([]);
  const [checking,setChecking]=useState(true);
  const [query,setQuery]=useState("");
  const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let active=true;
    Promise.all(connectors.map(async connector=>{try{return await connector.getProvider()?connector.uid:null;}catch{return null;}})).then(ids=>{if(active){setAvailable(ids.filter((id):id is string=>id!==null));setChecking(false);}});
    return()=>{active=false;};
  },[connectors]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    function keydown(event:KeyboardEvent){
      if(event.key==="Escape"){onClose();return;}
      if(event.key!=="Tab")return;
      const elements=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]')??[]);
      const first=elements[0],last=elements[elements.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    document.addEventListener("keydown",keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",keydown);previous?.focus({preventScroll:true});};
  },[onClose]);
  const detected=connectors.filter(connector=>available.includes(connector.uid));
  // The generic injected connector duplicates whichever named wallet already announced itself.
  const named=detected.some(connector=>connector.type!=="injected"||connector.id!=="injected");
  const wallets=detected.filter(connector=>!(named&&connector.id==="injected")&&connector.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="launch-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="launch-modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="wallet-title" aria-describedby="wallet-description">
      <div className="launch-modal-header"><span className="launch-modal-eyebrow">YOUR WALLET. YOUR CONTROL.</span><button type="button" className="launch-modal-close" aria-label="Close wallet selection" onClick={onClose}>×</button></div>
      <div className="launch-modal-icon"><WalletIcon/></div>
      <h2 className="launch-modal-title" id="wallet-title">A familiar way <em>in.</em></h2>
      <p className="launch-modal-subtitle" id="wallet-description">Connect a wallet available in your browser to continue.</p>
      <label className="launch-wallet-search"><span className="sr-only">Search detected wallets</span><input className="launch-wallet-search-input" type="search" placeholder="Search your wallets" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="launch-wallet-list" aria-live="polite">
        {checking?<p className="launch-wallet-empty">Checking available wallets…</p>:wallets.length?wallets.map(connector=><button type="button" className="launch-wallet-item" disabled={isPending} key={connector.uid} onClick={()=>connect({connector})}><span className="launch-wallet-icon-placeholder">{connector.icon?<img src={connector.icon} alt="" width={24} height={24} style={{borderRadius:6}}/>:<WalletIcon/>}</span><span className="launch-wallet-name">{connector.name}</span><span className="launch-wallet-detected">{isPending?"Connecting…":"Detected ↗"}</span></button>):<div className="launch-wallet-empty"><strong>{query?"No matching wallet":"No browser wallet detected"}</strong><p>{query?"Try another wallet name.":"Open Siro in your wallet’s browser, or install a browser wallet and refresh this page."}</p></div>}
      </div>
      {error&&<p className="launch-wallet-error" role="alert">{error.message.split("\n")[0]}</p>}
      <p className="launch-protected">Connecting requests access to your wallet address. Never share your recovery phrase.</p>
    </div>
  </div>;
}

export default function LaunchPage(){
  const router=useRouter();
  const {isConnected}=useAccount();
  const [showSignIn,setShowSignIn]=useState(false);
  const closeModal=useCallback(()=>setShowSignIn(false),[]);
  useEffect(()=>{if(isConnected)router.replace("/app");},[isConnected,router]);
  return <div className="rusd-shell editorial-site launch-site"><Header/>
    <main className="launch-page" id="main-content" tabIndex={-1}>
      <section className="launch-left cinematic-section" data-tone="dark" data-tone-local="true" aria-labelledby="launch-heading">
        <CinematicBackground variant="dusk" />
        <div className="launch-left-top"><span className="pill-badge">Your next starting point</span><span className="launch-panel-index">01 / SIRO</span></div>
        <div className="launch-left-bottom"><span className="siro-brand-mask launch-feature-mark" aria-hidden="true"/><h1 id="launch-heading" className="launch-tagline">Capital follows<br/><em className="launch-tagline-italic">intelligence.</em></h1><p className="launch-panel-copy">A clearer view of the possibilities.<br/>A considered approach to what comes next.</p></div>
        <ClassicalArtwork name="column" className="launch-classical-art"/>
        <div className="launch-left-footer"><span className="launch-chain-label">Non-custodial by design.</span><span className="launch-panel-index">YOUR CAPITAL. YOUR RULES.</span></div>
      </section>
      <section className="launch-right" aria-labelledby="launch-welcome"><div className="launch-right-content">
        <p className="eyebrow">Make yourself at home</p>
        <h2 id="launch-welcome" className="launch-welcome">Welcome to <em className="launch-welcome-italic">Siro.</em></h2>
        <p className="launch-welcome-sub">Connect your own wallet. Stay in control.</p>
        <div className="launch-features">{["Your assets stay in a non-custodial vault.","Set the boundaries for your strategy.","Review your settings before committing capital."].map(text=><div className="launch-feature" key={text}><span className="launch-check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>{text}</span></div>)}</div>
        <button type="button" className="launch-continue-btn" onClick={()=>setShowSignIn(true)} disabled={isConnected}>{isConnected?"Opening your workspace…":"Continue with a wallet"}<span aria-hidden="true">↗</span></button>
        <p className="launch-disclaimer">Siro is in beta. Investing involves risk. <Link href="/risk">Read the disclosures</Link> before committing capital.</p>
        <div className="launch-help"><Link href="/docs">Read the field guide ↗</Link><Link href="/">Back to Siro ↗</Link></div>
      </div></section>
    </main>
    <p className="launch-supported">Supported networks · {CHAIN_LIST_TEXT}</p>
    {showSignIn&&<SignInModal onClose={closeModal}/>}
  </div>;
}
