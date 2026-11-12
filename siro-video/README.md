# Siro — Agent Launch / Montage

20 seconds, 1920×1080, 30 fps. **No voiceover.** Original instrumental music and short tactile SFX. Composition: `SIRO-AGENT-LAUNCH`.

## Preview

Run `npm run dev` in this directory. Current Studio: http://localhost:3001/SIRO-AGENT-LAUNCH.

## Direction

The supplied Cero screenshots inform the edit language: short shots, a spinning brand object, match cuts into phone UI, macro notifications, close-ups, circular collage, and a minimal brand ending. All branding remains Siro: charcoal #0A0B12, lavender #A597FF, pink #EEB2CB, peach #F3CDB0, cream #E9E1D6, warm white #F4F2EE. Fonts are Instrument Sans, Hedvig Letters Serif, and Instrument Serif italic from the Siro website. The sharp logo is a local Siro asset. No hero image or photographic backdrop is used in the active composition. This version uses authored UI and geometric animation, not live-action footage.

## Shot list

| Frames | Shot |
| --- | --- |
| 0–47 | Siro disc flips into lens on charcoal |
| 48–104 | Match cut: disc lands over a phone |
| 105–149 | Policy notification macro |
| 150–194 | “Your rules.” typography cut |
| 195–254 | Strategy card and asset burst |
| 255–314 | Phone portfolio dial |
| 315–365 | Guard settings macro |
| 366–434 | Phone notification close-up |
| 435–509 | Circular product collage |
| 510–539 | “In motion.” |
| 540–599 | Siro logo ending |

Active source: `src/Montage.tsx`. All motion uses the Remotion frame clock, spring timing, perspective transforms, and deliberate cuts. No corner watermark. Product data is illustrative and shown in paper mode; there are no fabricated returns or profit claims.

The montage now includes front/back coin faces and physical depth, extruded phone edges, perspective rotation on product cards, floating collage discs, and simulated tap feedback on an allocation row. `src/components/DepthTransition.tsx` provides masked camera turns, vertical lifts, and circular focus reveals. Transitions use opaque masks so text from two shots does not ghost together. Overlap is accounted for in TransitionSeries: duration remains exactly 600 frames, and shot start times stay aligned with the existing soundtrack. These interactions are authored animation, not mouse-controlled video playback.

## Audio

`src/components/Soundtrack.tsx` contains music and SFX only. No VO is mounted, and there is no voice ducking. Previous VO files and studies are retained but unused. `compose-audio.py` creates original instrumental and tactile SFX using Python NumPy and FFmpeg, with accents timed to the montage cuts. No stock music or third-party recordings are used.

## Checks and export

`npx tsc --noEmit` checks source. `npx remotion compositions src/index.ts` verifies 600 frames at 30 fps. `node audit-montage.cjs` renders 31 frames across entrances, holds, and exits and creates `out/audit/contact.png` for review. Layout corrections include fixed phone dimensions, centered camera island, safe card bounds, no unintended zoom cropping, no overlapping asset badges, and six fully contained collage circles with readable content.

Optional export: `npx remotion render src/index.ts SIRO-AGENT-LAUNCH out/siro-agent-launch.mp4 --codec=h264`.
