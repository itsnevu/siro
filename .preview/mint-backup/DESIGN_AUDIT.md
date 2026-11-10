# Design Audit — Pyris Pact (pillar-main)

## Framework & Stack
- **Next.js 16.3.4** with App Router (Turbopack)
- **React 19.2.8**
- **Tailwind CSS 4** (via @tailwindcss/postcss)
- **wagmi 3.7.7** + **viem** for wallet integration
- **TypeScript 5**

## Global Styling Architecture
- `globals.css`: Tailwind import + CSS custom properties (design tokens)
- `pyris.css`: Main component stylesheet (~780 lines), custom CSS classes
- `effects.css`: Motion layer — shadows, hover effects, scroll reveal, ambient light
- `prose.css`: Long-form page styles (docs, blog, legal pages)
- Tailwind `@theme inline` block maps CSS vars to Tailwind tokens

## Existing Branding
- **Product**: Pyris Pact — programmable B2B milestone escrow
- **Logo**: `/brand/pyris-mark.png` (mark) + "pyris." wordmark in Libre Caslon Text
- **Illustrations**: SVG files in `/illustrations/` (pyris-column, pyris-urn, pyris-arch, pyris-scales)
- **Font**: Libre Caslon Text (display), system sans-serif (body)
- **Original palette**: Warm stone (terracotta accent #d97645, dark ink #292524, muted #57534e)

## Landing Page Sections
1. Beta notice banner
2. Sticky header (logo, nav, network switcher, wallet connect)
3. Hero (headline, copy, CTA, position preview graphic)
4. Tab navigation (Milestone Escrows / Pact Dashboard / How it works)
5. Pool summary text
6. Live Escrow Milestones table (reads from smart contract)
7. "Why Businesses Choose Pyris Pact" comparison cards
8. "How Pyris Pact works" 3-step flow
9. FAQ accordion (2-column layout)
10. Network/technology footer (Arc + Robinhood Chain logos)
11. Footer links

## Application Pages
- `/app` — Pact Dashboard (create/manage escrows)
- `/app/[asset]` — Market view with borrow form
- `/blog`, `/blog/[slug]` — Blog index and articles
- `/docs`, `/whitepaper`, `/risk`, `/terms`, `/privacy` — Prose pages

## Responsive Breakpoints
- 980px, 900px, 820px, 760px, 650px, 600px, 560px, 500px, 420px, 389px, 360px

## API Boundaries (preserved)
- `/api/rpc/[chainId]` — RPC proxy
- wagmi hooks for contract reads
- Contract deployments in `/contracts/deployments/`

## Design Adaptation Plan
Transform the warm stone palette to a forest green palette inspired by Oreno's design language:
- P0: Global colors, typography scale, page background, spacing, radius
- P1: Navbar, hero, buttons, section composition
- P2: Cards, preview panels, tabs, FAQ, footer
- P3: Hover effects, transitions, ambient light, responsive polish
