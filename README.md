# Brandi — "Signal Thread, Light" launch film

15-second, 16:9, 30 fps SaaS launch film for **brandi** (AI Visibility · Generative Engine
Optimization), built as a [Remotion](https://remotion.dev) composition. One continuous magenta
signal thread carries the eye through six storyboard beats and finally coils into the loop of the
navy "b" mark.

## Run

```bash
npm install
npx remotion studio                       # live preview
npx remotion render BrandiLaunch out/brandi-launch-16x9-15s.mp4 --crf=17
```

Remotion is pointed at a local Chromium via `remotion.config.ts`; override with
`REMOTION_BROWSER=/path/to/chrome` if yours lives elsewhere (or remove the line to let Remotion
download its own).

## Structure

| Path | What |
|---|---|
| `src/theme.ts` | Locked palette (Paper, Ground, Navy, Ink, Magenta, Cyan, Fog, Ghost), fps, size |
| `src/components.tsx` | Thread, Card, Headline, Camera, BMark (the b as SVG paths), Chip, easing helpers |
| `src/scenes.tsx` | The six beats (A–F), each keyed on absolute frame numbers |
| `src/Film.tsx` | Scene gating by frame + the two audio layers |
| `public/fonts/Nunito.ttf` | Heavy rounded geometric sans (variable), loaded via `FontFace` |
| `public/audio/music.wav` | Light backing track (D-major pad, soft pulse, sub) |
| `public/audio/sfx.wav` | Sound design: thread whooshes, card ticks/thuds, ring sweeps, loop close, CTA pop |
| `tools/gen_audio.py` | Regenerates both WAVs from scratch with numpy only (`python3 tools/gen_audio.py public/audio`) |

## Beat sheet (frames @ 30 fps)

| Frames | Beat |
|---|---|
| 0–102 | Archive of unlit answer cards, push-in; thread enters bottom-left and lights card 1. "AI is answering for you." → "Nobody sees the answer." |
| 102–156 | Thread whips to card 2, passes slowly; cyan ring draws 0→100 %. "Track your AI Share of Voice." |
| 156–210 | Pull-back reveals the dashboard: 72 % bar, citation ring, sentiment chart. "See how models describe you." |
| 210–318 | Relay dive down a stack of five cards, then rise; cards align. "Write for people." / "Structure for AI." |
| 318–372 | Cards recede; thread coils one clockwise turn into the magenta loop; navy stem + bowl draw; cyan dot pops. |
| 372–450 | Wordmark slides in letter by letter, magenta i-dot lands last, secondary line, "Run a GEO Scan" chip, hold, fade to Paper. |
