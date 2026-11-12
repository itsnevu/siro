# Siro sound design

## Current direction: music and component SFX

The active film uses Hazy After Hours at a quiet background level with gentle ducking under SFX. There is no narration. Transition cues lead the mix; quieter component sounds follow card entrances, badge staggers, allocation draws, title entrances and collage assembly. Mosaic audio has a granular pulse; the continuous coin move has separate approach, retreat and landing gestures. `audit-sound-design.cjs` validates the combined music and SFX mix.

## Narration

The active version has no voice-over or speech ducking. The eight generated title reads and their scripts are retained as an unused study.

Music, transition SFX and component SFX are mounted in the film.

Music: **Hazy After Hours**, Alejandro Magaña (A. M.), Mixkit, item 132. The active edit begins at source second 8. Music is normalized to -23 LUFS, then faded and gently ducked under visual cues. It does not loop within this film.

Source: https://mixkit.co/free-stock-music/technology/

Music license: https://mixkit.co/license/modal/musicFree/

SFX sources: https://mixkit.co/free-sound-effects/transition/ and https://mixkit.co/free-sound-effects/interface/

| Source title | Mixkit item | Placement |
| --- | --- | --- |
| Fast small sweep transition | 166 | Quick horizontal sweeps |
| Technology transition slide | 3120 | Vertical lifts and diagonal brand reveal |
| Air zoom vacuum | 2608 | Coin approach and circular focus |
| Fast sci fi transition sweep | 3114 | 1.6-second mosaic reveals |
| Cool interface click tone | 2568 | Portfolio landing and policy toggles |
| Software interface start | 2574 | Policy confirmation and brand resolution |
| Page forward single chime | 1107 | Review notification |

SFX license: https://mixkit.co/license/modal/sfxFree/

These licenses permit use in this online marketing video. Music has additional restrictions for broadcast, games and music-only redistribution. SFX may not be redistributed as standalone stock or source assets. Library and processed audio are therefore local, ignored build assets; distribute the finished video, not the audio folders. These are licensed third-party sounds, not original Siro recordings.

## Rebuild

Run `node download-sound-design.cjs`, then `node prepare-sound-design.cjs` in this directory. FFmpeg is required. The download script also retains audition candidates; only files referenced by `DesignedAudio.tsx` are active.

`src/sound-cues.ts` defines 16 named, frame-aligned cues; `src/components/DesignedAudio.tsx` plays them with envelopes and music ducking. Mosaic and focus sounds follow their full effect duration. Sweep sounds stay short. The continuous coin opening has no artificial scene-cut whoosh. The diagonal final reveal has its own longer sweep, followed by a quiet resolution cue.

Run `node audit-sound-design.cjs` to verify asset decoding, cue bounds, durations, and combined peak headroom. It writes `out/audio-cue-sheet.json`. This is a technical mix check; final listening should use the Studio playback.
