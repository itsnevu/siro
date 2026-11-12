# Motion revision

The active composition is `SIRO-AGENT-LAUNCH`, 865 frames at 30 fps (28.83 seconds). This supersedes the 20-second timing in README.md.

`src/timing.ts` owns shot durations, transition overlaps, and computed audio cue positions. The two direct cuts (coin to phone and typography to strategy) have no overlap. Other transitions last 20–22 frames.

Typography uses a sustained zoom, perspective rotation, and layered shadows. Phone edges have stronger extrusion and contact shadows. The catch coin shrinks to the portfolio ring and clears by local frame 33, leaving the allocation visible.

`src/components/Soundtrack.tsx` places separate air, landing, click, and confirmation cues against shot-local events. Run `node prepare-motion-sfx.cjs` to regenerate the four deterministic original WAV assets. The existing instrumental loops at reduced volume and fades over the final 45 frames. The old baked foley track is no longer mounted.

Validation: `npm run lint`; `node audit-montage.cjs` checks 28 frames through the final frame and writes `out/audit/contact.png`. Preview: http://localhost:3001/SIRO-AGENT-LAUNCH.
