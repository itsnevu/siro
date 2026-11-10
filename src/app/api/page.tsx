import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, Section, Note } from "@/components/ProsePage";

export const metadata: Metadata = { title: "API  Siro", description: "Explore Siro’s developer resources and JSON-RPC integration." };
export default function APIPage() {
  return <ProsePage eyebrow="For builders" title="Build with a clearer foundation." lede="Explore the technical resources behind Siro. Start with the contracts and the same-origin JSON-RPC relay." toc={[{id:"resources",heading:"Developer resources"},{id:"relay",heading:"JSON-RPC relay"},{id:"limits",heading:"Request limits"}]}>
    <Section id="resources" heading="Start with the foundations"><p>Read the <Link href="/docs">documentation</Link> for the platform’s architecture, explore the <Link href="/security">security model</Link>, or learn about the <Link href="/x402">x402 payment design</Link>.</p></Section>
    <Section id="relay" heading="A same-origin JSON-RPC relay"><p>The application includes a relay at <code>POST /api/rpc/&lt;chainId&gt;</code> for supported chains. It accepts allowlisted wallet and contract methods such as <code>eth_chainId</code>, <code>eth_call</code>, and <code>eth_getTransactionReceipt</code>.</p><pre><code>{'{\n  "jsonrpc": "2.0",\n  "method": "eth_chainId",\n  "params": [],\n  "id": 1\n}'}</code></pre></Section>
    <Section id="limits" heading="Small requests. Clear boundaries."><p>Request bodies are capped at <span className="mono-meta">256 KB</span>, with up to <span className="mono-meta">50</span> requests per batch. Rate limits apply. Unsupported chains and methods return errors.</p><Note>The relay supports the application’s blockchain connections. API plans and future integrations described elsewhere may still be in development.</Note></Section>
  </ProsePage>;
}
