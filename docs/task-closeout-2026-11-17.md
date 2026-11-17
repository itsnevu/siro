---
status: TESTING
last_reviewed: 2026-11-17
---

# Task closeout — 2026-11-17

## Commits

- `2093ca7`: frozen witness receipt gate and killed-publication recovery tests.
- `f5296d4`: dedicated fork witness configuration, Rust receipt gate, chain authentication before signing, pinned Anvil kill/recovery test.
- `ac9976a7c14b548e644293f59c705f5e4895c2b0` (S1 baseline, tagged `t1-fork-only`): four-row verifier, evidence strip, truth corrections, stop disclosure, UI depth limits, security/team links, inline performance labels, and v2 note.

## DoD, verbatim, with results

**T1 — FAIL as a complete fork acceptance criterion.**

> 3 batches pass all four checks; stripped event shows "committed, never executed"; tampered reveal fails at hash match; out-of-order root flagged; junk root resolves nothing; killed witness tx holds execution and resumes clean.

The four checks, stripped-event state, tampered reveal, reversed order, and junk root pass unit fixtures. A real pinned Anvil fork passes three witnessed receipts plus killed-publisher recovery using the identical signed transaction and idempotent receipt append. Three complete Rust-to-vault execution batches passing all four checks on that fork have **not** been demonstrated.

publisher recovery is proven, runner crash recovery across every boundary is not

## S1–S5 execution progress

- S1: remote branch `refs/heads/feat/phase-0-harness` confirmed at `0585d6e18aabd74d541f72c35bcdf745f999fb11`; annotated tag `t1-fork-only` peels to `ac9976a7c14b548e644293f59c705f5e4895c2b0`. The tag remains the fork-only baseline even when the branch advances.
- S2: publisher RPC policy uses `ALLOWED_RPC_HOSTS`, exact comma-separated hostnames. Default is loopback; an explicit empty list denies all. An unlisted host follows the failed-receipt retry/missed-batch path before any RPC request or signature. Chain ID remains 4663. Nine policy/gate tests pass, including allowlisted non-loopback release after a receipt, unlisted-host hold, and actual publisher CLI rejection without a signed outbox. The pinned Anvil receipt/kill test also passes. No mainnet hostname has been enabled in local secrets or service configuration.
- S3: `DEPOSIT_CAP_ENFORCED` defaults to false. `/app` reads the server environment at request time and provides one boolean to direct and swap deposit controls. False restores normal direct deposits and makes depth limits advisory, with a visible note that capacity is not yet strategy-specific. True retains the current direct-deposit hold and swap ceiling enforcement. Normal wallet/amount readiness, swap quotes, and existing swap impact protection still apply. An invalid flag or missing policy provider fails closed. Twenty-four deposit/swap tests and both browser flag states pass. The local flag is unset, so its effective state is false; browser overrides were child-process test settings only.
- S4 remains required before S5; there are no new mainnet batch transactions.

**T3 — PARTIAL / FAIL pending an exhaustive claims and live-status acceptance check.**

> no claim the chain contradicts; strip chain-driven.

Known contradictory deployment/root claims were corrected in roadmap, changelog, whitepaper, FAQ, landing proof illustration, status, and vaults. Witness/anchor/session fields read chain logs/state; an incomplete scan produces unavailable, never zero. Scheduler heartbeat and missing reveals are explicitly operator observations because these have no corresponding chain source. The rendered status page passed a browser smoke check; successful production RPC scans and every claim across the repository have not been exhaustively accepted.

**T9 — PASS (UI scope).** Both deposit surfaces print “stops are checked every 60 minutes; a gap can blow through them”, reading `config/engine-cadence.json`. A test matches it to the existing hourly scheduler. No scheduler cadence changed.

**T10 — PARTIAL / FAIL for all-token, all-vault coverage.** Enabled swap routes display a computed ceiling in input-token units and a live quote estimate. The ceiling is 25 basis points of the lesser of active virtual reserve and actual input inventory. S3 makes enforcement conditional on `DEPOSIT_CAP_ENFORCED=true`: above-ceiling or above-50-basis-point-impact quotes cannot submit, missing depth holds swaps, and direct deposits without strategy depth remain held. The default false setting restores direct deposits and makes the depth model advisory with an explicit disclosure. This is a UI policy, not a contract invariant. Disabled stock-token routes were not enabled, and portfolio allocation capacity has not been implemented.

**T11 — PASS for repository/disclosure scope.** Anonymous `git -c credential.helper= ls-remote https://github.com/itsnevu/siro.git HEAD` succeeds. SECURITY.md provides private disclosure and response targets, with links in both footers and whitepaper. Private GitHub vulnerability reporting is not claimed to be enabled. S1 publishes the branch and the `t1-fork-only` baseline tag; neither publication activates mainnet execution.

**T13 — PARTIAL / FAIL for complete identity disclosure.** `/team` links public handle @itsnevu, reviewable Rust/Next.js work, and deployment owner addresses; both footers link it. Human key custody and external prior work remain unattested rather than invented.

**T14 — PARTIAL / FAIL for a site-wide every-number audit.** Landing decisions have a visible “no onchain decisions yet” badge. Existing PaperFig performance values now require gross/net basis and show backtest/paper/live inline. A complete inventory of every number throughout the application is unfinished.

**T15 — PASS (documentation only).** Roadmap and whitepaper state DecisionLog.sol exists but is undeployed, explain gas/storage/availability/metadata tradeoffs, and reserve T2/T4/T6/T7/T8 for a separately reviewed v2 migration. No contracts, deployments, or migrations were changed or run.

## Validation

- Pinned Anvil fork, chain 4663, block 116549770, fresh witness key funded only through `anvil_setBalance`: PASS. One initial confirmation-cache failure was fixed; the next run passed. No Tenderly or mainnet writes.
- Node verifier/gate/proof tests: 13 passed.
- Vitest swap/depth/cadence checks: 21 passed with the repository's public zap address configured.
- `cargo test -p replay -p api`: 11 tests passed, including deterministic/resumable backtest, causality, and publication checks. Existing WinLibs MinGW plus stable GNU repaired the initial missing-libgcc failure.
- TypeScript and changed-file ESLint: passed; final label and documentation changes receive a final check before commit.
- Docs lint: 59 files checked in the final run.
- Headless Playwright smoke: `/verify`, `/roadmap`, `/team`, `/status`, `/whitepaper`, and `/` returned 200 and displayed their expected disclosures.

## Unfinished

- Full three-batch fork trading acceptance, including runner crash recovery and all four chain-backed checks together.
- Strategy-specific deposit capacity for direct deposits and disabled token routes. Direct deposits are held only when `DEPOSIT_CAP_ENFORCED=true`; the default false setting is explicitly advisory.
- Complete key-holder attestations, external prior-work disclosure, and site-wide number-label audit.
- Production acceptance of chain-status scanning and its log-provider availability.
- Next.js 16.4.3 emitted a security-advisory reminder at dev startup. Dependency upgrades are outside this task's edits and remain unresolved.
- No deployed website or running mainnet service was updated. S1 publishes Git refs only; remote-ref acceptance is recorded separately from trading acceptance.

## Three riskiest changes

1. Execution depends on witness receipt availability and dedicated configuration. The tagged baseline is fork-only; S2 replaces that hardcoded restriction with an explicit hostname allowlist whose default remains loopback. Configuring a mainnet hostname is not evidence that S4 passed. Mainnet activation is not ready.
2. Deposit policy trades availability against capacity control: false restores direct deposits without a strategy-specific ceiling; true holds them without depth evidence. Swap ceilings remain a liquidity model plus a current quote, not a future execution guarantee.
3. Verification still needs operator-served content and execution associations. RPC failure, absent new ordinal metadata, old receipts, configuration mismatch, or missing events fail closed. A matching event does not publish the revealed decision content.

## What the chain still does not prove

No mainnet decision commitments, three complete accepted trading batches, audited safety, profitability, continuous stop enforcement, future depth, journal availability, or human key custody are established. The stop cadence and capacity model are software/configuration disclosures. Backtest/paper results are not live trading evidence. Witnessing an arbitrary root proves neither a revealed decision nor execution; an owner daily anchor remains a separate check. The two USDG addresses are distinct assets, and no conversion or migration is claimed.
