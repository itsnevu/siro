# Reference Design System — Extracted from Oreno (useoreno.com)

## Color Tokens

| Token | Value | Usage | Confidence |
|---|---|---|---|
| --color-page | var(--bg) (warm paper) | Page background | inferred from `bg-paper`, theme-color var(--surface-2) |
| --color-surface | var(--card) | Card/panel backgrounds | measured |
| --color-surface-raised | var(--bg) | Elevated/soft surfaces | inferred from paper/sage pattern |
| --color-forest | var(--fg) | Primary dark (buttons, headings) | inferred from bg-forest + gradient var(--fg) |
| --color-forest-soft | var(--fg) | Hover state for forest | inferred from hover:bg-forest-soft |
| --color-text-primary | var(--fg) | Primary text (forest) | measured from text-forest |
| --color-text-secondary | var(--secondary) | Secondary text (moss) | inferred from text-moss |
| --color-text-fg-70 | var(--secondary) | Muted text (sage) | inferred from text-sage |
| --color-accent | var(--secondary) | Green accent, CTAs | measured |
| --color-lime | var(--secondary) | Highlight/accent bright | inferred from bg-lime, text-lime |
| --color-sage | var(--secondary) | Subtle backgrounds, borders | measured |
| --color-sage-deep | var(--secondary) | Deeper sage | inferred |
| --color-moss | var(--secondary) | Muted elements, outlines | inferred from text-moss, focus:outline-moss |
| --color-border | color-mix(in srgb,var(--fg) 10%,transparent) | Card borders | measured from ring-forest/10 |
| --color-error | var(--danger) | Error/warning | measured |
| --color-error-bg | color-mix(in srgb,var(--danger) 12%,transparent) | Error background | measured |
| --color-success | var(--secondary) | Success text | measured |

## Typography Tokens

| Token | Value | Usage | Confidence |
|---|---|---|---|
| --font-display | serif (variable) | Hero, section headings | measured (font-serif class) |
| --font-body | system sans-serif | Body copy, UI | measured |
| --font-mono | monospace | Code/addresses | measured |
| --text-hero | clamp(42px, 6vw, 88px) | Hero headline | measured |
| --text-display-1 | clamp(32px, 3.6vw, 46px) | Section headings | measured |
| --text-display-2 | 26px-36px | Sub-headings | measured |
| --text-display-3 | 24px | Card titles | measured |
| --text-body-lg | 17-19px | Large body | measured |
| --text-body | 15-16px | Standard body | measured |
| --text-body-sm | 13-14px | Small body | measured |
| --text-caption | 11-12px | Captions, labels | measured |
| --tracking-tight | -0.03em | Display text | measured |
| --tracking-normal | -0.01em to -0.02em | Body text | measured |
| --leading-body | 1.5-1.6 | Body text | measured |
| --leading-tight | 1.0-1.15 | Headings | inferred |
| --font-weight-medium | 500 | Body emphasis | measured (font-medium) |

## Border Radius Scale

| Token | Value | Usage | Confidence |
|---|---|---|---|
| --radius-xs | 4px | Tags, small pills | measured |
| --radius-sm | 8px-9px | Small cards, badges | measured |
| --radius-md | 12px | Inputs, medium cards | measured |
| --radius-lg | 16px | Cards, panels | measured |
| --radius-xl | 20px-24px | Large cards, sections | measured |
| --radius-2xl | 28px-34px | Hero cards, modals | measured |
| --radius-3xl | 36px-40px | Large feature panels | measured |
| --radius-full | 9999px | Pills, avatars | measured |

## Shadow Scale

| Token | Value | Usage | Confidence |
|---|---|---|---|
| --shadow-soft | var(--shadow-soft) custom | Card hover | measured from class |
| --shadow-lift | var(--shadow-lift) + inset-hi | Elevated hover | measured from class |
| --shadow-inset-hi | var(--shadow-inset-hi) | Inner highlight | measured from class |
| --shadow-drop | 0 6px 14px -4px rgb(16 42 36/0.5) | Button/dark element | measured |

## Layout Tokens

| Token | Value | Confidence |
|---|---|---|
| --container-max | ~1200px | inferred |
| --section-spacing | 80-120px | inferred from page structure |
| --card-padding | 20-28px | measured from class patterns |
| --grid-gap | 16-24px | measured |

## Interaction Patterns

| Pattern | Value | Confidence |
|---|---|---|
| Button hover | active:scale-[0.98] | measured |
| Transitions | background-color, box-shadow, color, transform | measured |
| Backdrop blur | backdrop-blur-md (12px) | measured |
| Focus outline | 2px moss, offset 2px | measured |
| Scroll reveal | opacity + blur + translateY | measured from inline styles |
| Marquee animation | animate-marquee | measured |

## Section Structure (from markdown extraction)

1. Navigation bar with "Agentic investing on Robinhood Chain" eyebrow link
2. Hero: large serif headline + two CTAs + banner image with floating status cards
3. "Why Oreno" - numbered benefit cards (01-04)
4. Platform section with tabbed interface (Discover/Studio/Agent)
5. Product preview panels with illustrative mockups
6. Strategy templates (5 pattern cards)
7. Labels explanation section
8. "How it works" - 4 numbered steps
9. "Agents propose. You decide." - 3-column safety section
10. Network/integration section with live data marquee
11. FAQ accordion
12. Footer
