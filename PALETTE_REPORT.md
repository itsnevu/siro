# Mint–teal palette verification

The existing Siro layout, original logo silhouette, Hedvig / Instrument fonts, floating header, FAQ alignment, and 3D motion are retained. Only the color system and the way assets obtain their colors changed. No Hyperliquid logo, copy, or assets are used.

## Authoritative tokens

All color literals are defined in [tokens.css](src/styles/tokens.css). [tailwind.config.ts](tailwind.config.ts) and Tailwind v4's inline theme map these same variables. Dark mode follows the system color preference; adding the dark class also selects the dark tokens. Dark sections use their own scope. Secondary body and small metadata use the accessible fg-70 token; the deliberately faint muted token is reserved for borders/benchmark graphics, not body copy.

## Source searches

Audited 174 owned text files, including source, assets, docs, scripts and root configuration. Dependencies, build output, archived pre-change source and screenshots are excluded; those are not shipped application source. The original bitmap is retained as an alpha-only geometry master in src/assets; both browser and social-image renderers paint its silhouette with the new tokens.

```text
Old palette search: (no matches)
Raw hex in app/components: (no matches)
Raw hex outside tokens.css: (no matches)
```

## WCAG contrast

Ratios use sRGB relative luminance and alpha compositing against each background, with 4.5:1 required for normal text.

| Pair | Light | Dark | AA |
| --- | ---: | ---: | --- |
| Foreground / page | 16.08:1 | 16.08:1 | Pass |
| Secondary body / page | 6.20:1 | 8.37:1 | Pass |
| CTA text / mint | 14.01:1 | 14.01:1 | Pass |
| Foreground / surface-2 | 14.04:1 | 12.41:1 | Pass |
| Light text / dark section | 16.08:1 | 16.08:1 | Pass |
| Mint / dark section | 14.01:1 | 14.01:1 | Pass |

Mint is a background with dark text on light pages, and a foreground/graphic only on dark surfaces. Primary button labels use the dedicated primary-fg token in both modes.

## Browser verification

- Production build and TypeScript checked separately.
- Home checked at 375, 768, 1280 and 1600px in light and dark mode: no horizontal overflow.
- Strategies/detail, Studio, Agent, Markets, Token, Tokenomics, Buyback, API, Stats, Pricing, Security, Roadmap, About, FAQ, Blog, Legal and Launch checked: no broken images or browser exceptions.
- OG and generated icon endpoints returned HTTP 200. Favicon uses the generated mint icon and original logo silhouette.

## Screenshots

| View | Light | Dark |
| --- | --- | --- |
| hero | [View](.preview/mint/light-hero.png) | [View](.preview/mint/dark-hero.png) |
| visual | [View](.preview/mint/light-visual.png) | [View](.preview/mint/dark-visual.png) |
| cards | [View](.preview/mint/light-cards.png) | [View](.preview/mint/dark-cards.png) |
| dark-section | [View](.preview/mint/light-dark-section.png) | [View](.preview/mint/dark-dark-section.png) |
| footer | [View](.preview/mint/light-footer.png) | [View](.preview/mint/dark-footer.png) |
| mobile | [View](.preview/mint/light-mobile.png) | [View](.preview/mint/dark-mobile.png) |

[OG image](.preview/mint/opengraph.png) · [Icon](.preview/mint/icon.png)

## Changed source files

- DESIGN_AUDIT.md
- IMPLEMENTATION_SUMMARY.md
- REFERENCE_DESIGN_SYSTEM.md
- public/favicon.ico
- public/illustrations/siro-arch.svg (moved)
- public/illustrations/siro-column.svg (moved)
- public/illustrations/siro-scales.svg (moved)
- public/illustrations/siro-urn.svg (moved)
- public/wallets/1inch.svg (moved)
- public/wallets/37x.svg (moved)
- public/wallets/3s.svg (moved)
- public/wallets/88wallet.svg (moved)
- public/wallets/base.svg (moved)
- public/wallets/coinbase.svg (moved)
- public/wallets/metamask.svg (moved)
- public/wallets/rabby.svg (moved)
- public/wallets/rainbow.svg (moved)
- public/wallets/robinhood.svg (moved)
- scripts/verify-palette.mjs
- src/app/assets/[group]/[name]/route.ts
- src/app/brand/mark/route.ts
- src/app/favicon.ico
- src/app/icon.tsx
- src/app/layout.tsx
- src/app/opengraph-image.tsx
- src/assets/illustrations/siro-arch.svg
- src/assets/illustrations/siro-column.svg
- src/assets/illustrations/siro-scales.svg
- src/assets/illustrations/siro-urn.svg
- src/assets/siro-original.png
- src/assets/wallets/1inch.svg
- src/assets/wallets/37x.svg
- src/assets/wallets/3s.svg
- src/assets/wallets/88wallet.svg
- src/assets/wallets/base.svg
- src/assets/wallets/coinbase.svg
- src/assets/wallets/metamask.svg
- src/assets/wallets/rabby.svg
- src/assets/wallets/rainbow.svg
- src/assets/wallets/robinhood.svg
- src/components/ConnectButton.tsx
- src/components/Footer.tsx
- src/components/Header.tsx
- src/components/editorial/AllocationBar.tsx
- src/components/editorial/CTABand.tsx
- src/components/editorial/ColorMode.tsx
- src/components/editorial/PillTabs.tsx
- src/components/editorial/ToneController.tsx
- src/components/ui/Badge.tsx
- src/components/ui/PriceBadge.tsx
- src/components/ui/Sparkline.tsx
- src/lib/brand-palette.ts
- src/styles/palette.css
- src/styles/tokens.css
- src\app\about\page.tsx
- src\app\agent\page.tsx
- src\app\app\agent\page.tsx
- src\app\app\approvals\page.tsx
- src\app\app\page.tsx
- src\app\app\policies\page.tsx
- src\app\app\portfolio\page.tsx
- src\app\app\schedules\page.tsx
- src\app\app\settings\page.tsx
- src\app\app\strategies\page.tsx
- src\app\app\studio\page.tsx
- src\app\app\token\page.tsx
- src\app\buyback\page.tsx
- src\app\globals.css
- src\app\how-it-works\page.tsx
- src\app\launch\page.tsx
- src\app\markets\[ticker]\page.tsx
- src\app\markets\page.tsx
- src\app\pricing\page.tsx
- src\app\roadmap\page.tsx
- src\app\security\page.tsx
- src\app\stats\page.tsx
- src\app\strategies\[id]\page.tsx
- src\app\strategies\page.tsx
- src\app\studio\page.tsx
- src\app\token\page.tsx
- src\app\tokenomics\page.tsx
- src\app\x402\page.tsx
- src\components\ConnectButton.tsx
- src\components\Footer.tsx
- src\components\Header.tsx
- src\components\Hero.tsx
- src\components\app\AppShell.tsx
- src\components\app\Explorer.tsx
- src\components\editorial\AllocationBar.tsx
- src\components\editorial\CTABand.tsx
- src\components\editorial\HeroVisual.tsx
- src\components\editorial\Ladder.tsx
- src\components\editorial\MockAppCard.tsx
- src\components\editorial\NumberedFeatureList.tsx
- src\components\editorial\PillTabs.tsx
- src\components\editorial\Section.tsx
- src\components\editorial\StatBlock.tsx
- src\components\editorial\TemplateCard.tsx
- src\components\ui\AddressChip.tsx
- src\components\ui\Badge.tsx
- src\components\ui\DataTable.tsx
- src\components\ui\FAQAccordion.tsx
- src\components\ui\PriceBadge.tsx
- src\components\ui\SectionHeader.tsx
- src\components\ui\StatCard.tsx
- src\components\ui\Timeline.tsx
- src\lib\network.tsx
- src\styles\editorial.css
- src\styles\effects.css
- src\styles\floating-header.css
- src\styles\hero-depth.css
- src\styles\launch.css
- src\styles\prose.css
- src\styles\siro.css
- tailwind.config.ts

SVG wallet and illustration geometry was moved from public into src/assets and served through a token-colored asset route. The original logo bitmap was moved into src/assets/siro-original.png; its shape is not redrawn.
