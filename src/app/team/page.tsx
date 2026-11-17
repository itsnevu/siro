import { ProsePage } from '@/components/ProsePage';

export const metadata = { title: 'Team and key holders | Siro' };
export default function TeamPage() {
  return <ProsePage title="Team and key holders" lede="Public identities and verifiable work, dated 2026-11-17. Pseudonyms are accepted; undisclosed custody is identified explicitly.">
    <h2>Public repository identity</h2><p><a href="https://github.com/itsnevu">@itsnevu</a> owns the public <a href="https://github.com/itsnevu/siro">Siro repository</a>. Work available for review: the <a href="https://github.com/itsnevu/siro/tree/feat/phase-0-harness/crates">Rust execution and ledger crates</a> and <a href="https://github.com/itsnevu/siro/tree/feat/phase-0-harness/src">Next.js application</a>. External employment, prior projects, and individual authorship have not been independently verified.</p>
    <h2>Key holders</h2><p>The deployment evidence records Anchor and SessionExecutor owner address <code>0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4</code>. The human or organization holding that key has not been publicly attested; repository ownership does not establish key custody. Each vault has its own onchain owner. Operator and session keys depend on that vault’s configuration.</p>
    <p>The witness key is a separate fork-only identity generated for tests; it is neither the owner key nor the operator EOA. No mainnet witness key holder is claimed. Current ownership must be read from the contracts rather than inferred from this dated deployment record.</p>
  </ProsePage>;
}
