import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BMark,
  Camera,
  Card,
  Chip,
  Headline,
  MARK_DOT,
  MARK_H,
  MARK_LOOP_C,
  MARK_LOOP_R,
  MARK_W,
  Studio,
  Thread,
  clamp01,
  greek,
  pop,
  progressAtY,
  ramp,
  settle,
  useCamera,
} from "./components";
import { CARD_RADIUS, CYAN, FOG, FONT, GHOST, GROUND, H, MAGENTA, NAVY, PAPER, W } from "./theme";

/* ------------------------------------------------------------------ */
/* archive of unlit answer cards (shared background element)           */
/* ------------------------------------------------------------------ */

type ArchiveCard = { x: number; y: number; w: number; h: number; depth: number; seed: number; phase: number };

const makeArchive = (n: number, seed: number, exclude?: { x: number; y: number; r: number }): ArchiveCard[] => {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: ArchiveCard[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 2000) {
    const depth = 0.35 + rnd() * 0.65; // 1 = near
    const w = 150 + rnd() * 120;
    const h = w * (0.55 + rnd() * 0.2);
    const x = -100 + rnd() * (W + 200);
    const y = -40 + rnd() * (H * 0.6);
    if (exclude && Math.hypot(x - exclude.x, y - exclude.y) < exclude.r) continue;
    if (out.some((c) => Math.abs(c.x - x) < (c.w + w) * 0.45 && Math.abs(c.y - y) < (c.h + h) * 0.5)) continue;
    out.push({ x, y, w, h, depth, seed: out.length + 1, phase: rnd() * Math.PI * 2 });
  }
  return out.sort((a, b) => a.depth - b.depth);
};

const Archive: React.FC<{ cards: ArchiveCard[]; frame: number; opacity?: number; driftScale?: number }> = ({
  cards,
  frame,
  opacity = 1,
  driftScale = 1,
}) => (
  <>
    {cards.map((c, i) => {
      const drift = Math.sin(frame / 70 + c.phase) * 6 * driftScale;
      const sc = 0.55 + c.depth * 0.45;
      return (
        <Card
          key={i}
          x={c.x + drift * 0.4}
          y={c.y + drift}
          w={c.w}
          h={c.h}
          scale={sc}
          lines={greek(4, c.seed)}
          avatar={c.seed % 3 === 0}
          opacity={opacity * (0.35 + c.depth * 0.65)}
          blur={c.depth < 0.55 ? (0.55 - c.depth) * 5 : 0}
        />
      );
    })}
  </>
);

/* ------------------------------------------------------------------ */
/* SCENE A — Frames 1 & 2 (0–102): archive → thread lights card 1      */
/* ------------------------------------------------------------------ */

const CARD1 = { x: 960, y: 440, w: 380, h: 250 };
const PATH_A =
  "M -20 1010 C 320 980, 600 800, 840 575 C 930 490, 900 440, 985 400 C 1060 360, 1010 330, 1030 300 C 1100 220, 1400 150, 1960 110";

/** soft Paper fade so headlines never fight with drifting cards */
const TypeBand: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(255,255,255,0) 62%, rgba(255,255,255,0.92) 78%, ${PAPER} 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const SceneA: React.FC = () => {
  const frame = useCurrentFrame();
  const archive = useMemo(() => makeArchive(30, 7, { x: CARD1.x, y: CARD1.y, r: 330 }), []);
  const lines = useMemo(() => greek(8, 11), []);

  const cam = useCamera(frame, [
    { f: 0, x: 960, y: 540, s: 1 },
    { f: 42, x: 960, y: 520, s: 1.08 },
    { f: 66, x: 960, y: 445, s: 1.52 },
    { f: 102, x: 960, y: 438, s: 1.56 },
  ]);

  // thread speed ramps: enter slowly, 0.3s dash to the card, 0.9s pass, exit
  const pEnter = progressAtY(PATH_A, CARD1.y + CARD1.h / 2 + 10, 700, 1250, "up");
  const pExit = progressAtY(PATH_A, CARD1.y - CARD1.h / 2 - 10, 700, 1250, "up");
  const progress = interpolate(frame, [8, 46, 55, 82, 102], [0, pEnter * 0.55, pEnter, pExit, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // per-line lighting by head crossing
  const top = CARD1.y - CARD1.h / 2;
  const pad = CARD1.h * 0.11;
  const lh = Math.max(6, Math.round((CARD1.h - pad * 2) / (lines.length * 1.9)));
  const gap = Math.round(lh * 0.9);
  const lit = lines.map((_, i) => {
    const ly = top + pad + i * (lh + gap) + lh / 2;
    const pl = progressAtY(PATH_A, ly, 700, 1250, "up");
    // frame at which head crosses
    const fCross = interpolate(pl, [pEnter, pExit], [55, 82]);
    return ramp(frame, fCross, fCross + 6, Easing.out(Easing.quad));
  });
  const firstLit = lit[lines.length - 1];
  const settleAmt = firstLit > 0 ? 1 - settle(frame, 55 + 20 * (1 - 0), 10) * 0 : 0;
  const litSettle = interpolate(frame, [76, 79, 82], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Studio />
      <Camera cam={cam}>
        <Archive cards={archive} frame={frame} />
        <Card
          {...CARD1}
          lines={lines}
          lit={lit}
          magentaIndex={4}
          avatar
          settleAmount={Math.max(litSettle, settleAmt * 0)}
        />
        <Thread d={PATH_A} progress={progress} />
      </Camera>
      <TypeBand />
      {frame < 48 ? (
        <Headline text="AI is answering for you." accent="answering" at={6} />
      ) : (
        <Headline text="Nobody sees the answer." accent="Nobody" at={48} />
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* SCENE B — Frame 3 (102–156): card 2 + cyan Share-of-Voice ring      */
/* ------------------------------------------------------------------ */

const CARD2 = { x: 960, y: 440, w: 500, h: 330 };
const PATH_B =
  "M -20 640 C 300 640, 560 620, 720 580 C 820 555, 870 470, 960 440 C 1040 410, 1080 330, 1180 300 C 1300 262, 1500 240, 1960 200";

export const SceneB: React.FC = () => {
  const frame = useCurrentFrame();
  const f = frame - 102;
  const archive = useMemo(() => makeArchive(16, 23, { x: CARD2.x, y: CARD2.y, r: 460 }), []);
  const lines = useMemo(() => greek(7, 5), []);

  const cam = useCamera(frame, [
    { f: 102, x: 960, y: 540, s: 1.0 },
    { f: 156, x: 960, y: 530, s: 1.04 },
  ]);

  const pEnter = progressAtY(PATH_B, CARD2.y + CARD2.h / 2, 700, 1220, "up");
  const pExit = progressAtY(PATH_B, CARD2.y - CARD2.h / 2, 700, 1220, "up");
  const progress = interpolate(frame, [102, 111, 138, 156], [0, pEnter, pExit, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const top = CARD2.y - CARD2.h / 2;
  const pad = CARD2.h * 0.11;
  const lh = Math.max(6, Math.round((CARD2.h - pad * 2) / (lines.length * 1.9)));
  const gap = Math.round(lh * 0.9);
  const lit = lines.map((_, i) => {
    const ly = top + pad + i * (lh + gap) + lh / 2;
    const pl = progressAtY(PATH_B, ly, 700, 1220, "up");
    const fCross = interpolate(pl, [pEnter, pExit], [111, 138]);
    return ramp(frame, fCross, fCross + 6, Easing.out(Easing.quad));
  });
  const litSettle = interpolate(frame, [132, 135, 139], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ring: 0 → 100% arc, draws over a Fog track
  const ringR = 272;
  const ring = ramp(frame, 112, 150, Easing.inOut(Easing.cubic));
  const C = 2 * Math.PI * ringR;

  return (
    <AbsoluteFill>
      <Studio />
      <Camera cam={cam}>
        <Archive cards={archive} frame={frame} opacity={0.7} />
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <circle cx={CARD2.x} cy={CARD2.y} r={ringR} fill="none" stroke={FOG} strokeWidth={5} opacity={f > 8 ? 1 : 0} />
          <circle
            cx={CARD2.x}
            cy={CARD2.y}
            r={ringR}
            fill="none"
            stroke={CYAN}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${C * ring} ${C}`}
            transform={`rotate(-90 ${CARD2.x} ${CARD2.y})`}
          />
        </svg>
        <Card {...CARD2} lines={lines} lit={lit} magentaIndex={3} settleAmount={litSettle} />
        <Thread d={PATH_B} progress={progress} />
      </Camera>
      <TypeBand />
      <Headline
        text="Track your AI Share of Voice."
        accent="Share of Voice"
        at={104}
        secondary="Brand inclusion · Citation frequency"
        secondaryAt={112}
        y={880}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* SCENE C — Frame 4 (156–210): dashboard panel assembles              */
/* ------------------------------------------------------------------ */

const PANEL = { x: 960, y: 450, w: 920, h: 540 };
const PATH_C = "M -20 760 C 260 760, 380 300, 500 182 L 1420 182";

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: NAVY, letterSpacing: "0.005em" }}>{children}</div>
);

const Panel: React.FC<{ frame: number; recede?: number }> = ({ frame }) => {
  const f = frame - 156;
  const pane = (delay: number) => {
    const s = settle(frame, 156 + delay, 16);
    return { s, o: ramp(frame, 156 + delay, 156 + delay + 6, Easing.linear) };
  };
  const a = pane(3);
  const b = pane(8);
  const c = pane(13);
  const bar = ramp(frame, 176, 202, Easing.out(Easing.cubic));
  const pct = Math.round(bar * 72);
  const ringR = 56;
  const C = 2 * Math.PI * ringR;
  const ring = ramp(frame, 178, 204, Easing.out(Easing.cubic));
  const chart = ramp(frame, 182, 208, Easing.out(Easing.cubic));
  const pts = [0, 34, 20, 44, 26, 52, 36, 58, 40, 62, 48, 66, 52].map((v, i) => [i * (700 / 12), 70 - v * 0.9]);
  const chartD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const left = PANEL.x - PANEL.w / 2;
  const top = PANEL.y - PANEL.h / 2;
  const cardStyle = (ox: number, oy: number, p: { s: number; o: number }): React.CSSProperties => ({
    position: "absolute",
    background: PAPER,
    border: `1px solid ${FOG}`,
    borderRadius: CARD_RADIUS,
    boxShadow: "0 12px 24px rgba(45,73,100,0.08)",
    padding: 26,
    boxSizing: "border-box",
    opacity: p.o,
    transform: `translate(${(1 - p.s) * ox}px, ${(1 - p.s) * oy}px) scale(${0.92 + 0.08 * p.s})`,
  });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: PANEL.w,
        height: PANEL.h,
        borderRadius: 30,
        background: GROUND,
        border: `1px solid ${FOG}`,
        boxShadow: "0 24px 48px rgba(45,73,100,0.10)",
        opacity: ramp(frame, 156, 162, Easing.linear),
      }}
    >
      {/* AI Share of Voice */}
      <div style={{ ...cardStyle(-70, -40, a), left: 32, top: 32, width: 410, height: 220 }}>
        <Label>AI Share of Voice</Label>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 70, color: NAVY, lineHeight: 1.1, marginTop: 8 }}>
          {pct}%
        </div>
        <div style={{ marginTop: 14, height: 18, borderRadius: 9, background: GHOST, overflow: "hidden" }}>
          <div style={{ width: `${bar * 72}%`, height: "100%", background: MAGENTA, borderRadius: 9 }} />
        </div>
      </div>
      {/* Citation Frequency ring */}
      <div style={{ ...cardStyle(70, -40, b), left: 474, top: 32, width: 414, height: 220 }}>
        <Label>Citation Frequency</Label>
        <svg width={150} height={150} style={{ position: "absolute", left: 132, top: 52 }}>
          <circle cx={75} cy={75} r={ringR} fill="none" stroke={GHOST} strokeWidth={16} />
          <circle
            cx={75}
            cy={75}
            r={ringR}
            fill="none"
            stroke={CYAN}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={`${C * 0.72 * ring} ${C}`}
            transform="rotate(-90 75 75)"
          />
        </svg>
      </div>
      {/* Sentiment Overview chart */}
      <div style={{ ...cardStyle(0, 70, c), left: 32, top: 282, width: 856, height: 226 }}>
        <Label>Sentiment Overview</Label>
        <svg width={760} height={90} style={{ position: "absolute", left: 48, top: 80, overflow: "visible" }}>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={0} x2={700} y1={10 + i * 30} y2={10 + i * 30} stroke={GHOST} strokeWidth={1} />
          ))}
          <path
            d={chartD}
            pathLength={1}
            fill="none"
            stroke={CYAN}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${chart} 1`}
          />
        </svg>
      </div>
    </div>
  );
};

export const SceneC: React.FC = () => {
  const frame = useCurrentFrame();
  const archive = useMemo(() => makeArchive(14, 41, { x: PANEL.x, y: PANEL.y, r: 560 }), []);
  const cam = useCamera(frame, [
    { f: 156, x: 740, y: 330, s: 1.6 },
    { f: 182, x: 960, y: 470, s: 1.14 },
    { f: 210, x: 960, y: 470, s: 1.14 },
  ]);
  const pCorner = progressAtY(PATH_C, 183, 480, 520, "up");
  const progress = interpolate(frame, [156, 176, 196, 210], [0, pCorner * 0.6, pCorner, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Studio />
      <Camera cam={cam}>
        <Archive cards={archive} frame={frame} opacity={0.6} />
        <Panel frame={frame} />
        <Thread d={PATH_C} progress={progress} />
      </Camera>
      <TypeBand />
      <Headline text="See how models describe you." accent="describe" at={160} secondary="Sentiment Hub" secondaryAt={168} y={880} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* SCENE D — Frame 5 (210–318): relay dive & rise through a stack      */
/* ------------------------------------------------------------------ */

const STACK = { x: 960, top: 226, w: 580, h: 72, gap: 22, n: 5 };
const STACK_JITTER = [-18, 14, -10, 16, -14];
const stackCardY = (i: number) => STACK.top + i * (STACK.h + STACK.gap) + STACK.h / 2;
const STACK_BOTTOM = stackCardY(4) + STACK.h / 2;
const PATH_D = `M 1940 118 C 1500 118, 1150 118, 956 196 L 956 ${STACK_BOTTOM + 40} C 956 ${STACK_BOTTOM + 78}, 966 ${
  STACK_BOTTOM + 78
}, 966 ${STACK_BOTTOM + 40} L 966 170 C 966 110, 1300 95, 1960 70`;

const StackCards: React.FC<{ frame: number; lit: number[]; align: number; recede?: number }> = ({
  frame,
  lit,
  align,
  recede = 0,
}) => (
  <>
    {Array.from({ length: STACK.n }).map((_, i) => {
      const l = lit[i];
      const x = STACK.x + STACK_JITTER[i] * (1 - align);
      const y = stackCardY(i);
      const lh = 11;
      const w1 = [0.62, 0.78, 0.7, 0.8, 0.66][i];
      const w2 = [0.46, 0.56, 0.5, 0.6, 0.48][i];
      const colA = interpolateLit(l, NAVY);
      const colB = interpolateLit(l, NAVY);
      const sc = (1 + 0.02 * litPulse(frame, lit, i)) * (1 - 0.08 * recede);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - STACK.w / 2,
            top: y - STACK.h / 2,
            width: STACK.w,
            height: STACK.h,
            borderRadius: 14,
            background: PAPER,
            border: `1px solid ${FOG}`,
            boxShadow: l > 0.3 ? "0 16px 30px rgba(45,73,100,0.15)" : "0 12px 24px rgba(45,73,100,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "0 22px",
            boxSizing: "border-box",
            transform: `scale(${sc})`,
            opacity: 1 - 0.8 * recede,
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 7, background: interpolateLit(l, NAVY) }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ height: lh, width: `${w1 * 100}%`, borderRadius: lh / 2, background: colA }} />
            <div style={{ height: lh, width: `${w2 * 100}%`, borderRadius: lh / 2, background: colB }} />
          </div>
        </div>
      );
    })}
  </>
);

const interpolateLit = (l: number, to: string) => {
  // GHOST → colour
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = hex(GHOST);
  const b = hex(to);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * clamp01(l)));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
};
const litPulse = (frame: number, lit: number[], i: number) => {
  // tiny settle pulse when a card lights
  const l = lit[i];
  return l > 0 && l < 1 ? Math.sin(l * Math.PI) : 0;
};

const stackLit = (frame: number) =>
  Array.from({ length: STACK.n }).map((_, i) => {
    const pCross = progressAtY(PATH_D, stackCardY(i), 940, 980, "down");
    const pTop = progressAtY(PATH_D, 200, 940, 980, "down");
    const pBottom = progressAtY(PATH_D, STACK_BOTTOM + 30, 940, 980, "down");
    const fCross = interpolate(pCross, [pTop, pBottom], [218, 252]);
    return ramp(frame, fCross, fCross + 6, Easing.out(Easing.quad));
  });

export const SceneD: React.FC = () => {
  const frame = useCurrentFrame();
  const archive = useMemo(() => makeArchive(16, 77, { x: 960, y: 440, r: 420 }), []);
  const pTop = progressAtY(PATH_D, 200, 940, 980, "down");
  const pBottom = progressAtY(PATH_D, STACK_BOTTOM + 30, 940, 980, "down");
  const pUpTop = pBottom + (1 - pBottom) * 0.62; // rough: back to the top of the stack on the rise
  const progress = interpolate(frame, [210, 216, 252, 264, 290, 318], [0, pTop, pBottom, pBottom + 0.01, pUpTop, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lit = stackLit(frame);
  const align = settle(frame, 266, 22);
  const cam = useCamera(frame, [
    { f: 210, x: 960, y: 520, s: 1.0 },
    { f: 252, x: 960, y: 572, s: 1.05 },
    { f: 290, x: 960, y: 500, s: 1.0 },
    { f: 318, x: 960, y: 500, s: 1.0 },
  ]);
  return (
    <AbsoluteFill>
      <Studio />
      <Camera cam={cam}>
        <Archive cards={archive} frame={frame} opacity={0.55} />
        <StackCards frame={frame} lit={lit} align={align} />
        <Thread d={PATH_D} progress={progress} />
      </Camera>
      <TypeBand />
      <Headline text="Write for people." accent="people" at={214} y={780} />
      <Headline text="Structure for AI." accent="AI" at={270} y={860} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* SCENE E — (318–372): thread coils into the loop, the b draws        */
/* ------------------------------------------------------------------ */

export const MARK_CENTER = { x: 960 - MARK_W / 2, y: 540 - MARK_H / 2 }; // box top-left, centred
const LOOP_WORLD = { x: MARK_CENTER.x + MARK_LOOP_C.x, y: MARK_CENTER.y + MARK_LOOP_C.y };
const PATH_E = `M 1940 70 C 1500 60, 1050 140, 870 330 C 790 420, 860 ${LOOP_WORLD.y - MARK_LOOP_R}, ${LOOP_WORLD.x} ${
  LOOP_WORLD.y - MARK_LOOP_R
} A ${MARK_LOOP_R} ${MARK_LOOP_R} 0 1 1 ${LOOP_WORLD.x - 0.01} ${LOOP_WORLD.y - MARK_LOOP_R}`;

const LOOP_LEN = 2 * Math.PI * MARK_LOOP_R;
const LOOP_FRAC = LOOP_LEN / (1700 + LOOP_LEN); // loop is the last part of PATH_E

export const SceneE: React.FC = () => {
  const frame = useCurrentFrame();
  const archive = useMemo(() => makeArchive(16, 77, { x: 960, y: 440, r: 420 }), []);
  const recede = ramp(frame, 318, 338, Easing.inOut(Easing.cubic));
  const lit = [1, 1, 1, 1, 1];
  // coil: fast approach, one clean clockwise turn
  const loopFrac = LOOP_FRAC;
  const progress = interpolate(frame, [318, 334, 347], [0, 1 - loopFrac, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const coilDone = frame >= 347;
  const loopWidth = ramp(frame, 347, 355, Easing.out(Easing.cubic));
  const stem = ramp(frame, 351, 360, Easing.inOut(Easing.cubic));
  const bowl = ramp(frame, 357, 368, Easing.inOut(Easing.cubic));
  const dot = frame >= 366 ? pop(frame, 366) : 0;
  return (
    <AbsoluteFill>
      <Studio />
      <Archive cards={archive} frame={frame} opacity={0.55 * (1 - recede)} />
      <div style={{ opacity: 1 }}>
        <StackCards frame={frame} lit={lit} align={1} recede={recede} />
      </div>
      {!coilDone ? <Thread d={PATH_E} progress={progress} /> : null}
      {coilDone ? (
        <BMark {...MARK_CENTER} loopDraw={1} loopWidth={loopWidth} stemDraw={stem} bowlDraw={bowl} dot={dot} />
      ) : null}
      {/* the thread tail stays in frame while the mark forms */}
      {coilDone ? <Thread d={PATH_E} progress={1 - loopFrac} showHead={false} /> : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* SCENE F — Frame 6 (372–450): lockup                                 */
/* ------------------------------------------------------------------ */

const SLAB = { x: 960, y: 540, w: 1260, h: 560 };
const LOCK_SCALE = 0.72;
const WORD_SIZE = 236;
const LETTERS = ["b", "r", "a", "n", "d", "ı"]; // dotless i; magenta dot added separately

/** measure "brand" and "ı" so the magenta i-dot lands exactly over the stem */
const measureWord = () => {
  const fallback = { brand: 700, i: 60 };
  if (typeof document === "undefined") return fallback;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fallback;
  ctx.font = `900 ${WORD_SIZE}px Nunito`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${-0.04 * WORD_SIZE}px`;
  return { brand: ctx.measureText("brand").width, i: ctx.measureText("ı").width };
};

export const SceneF: React.FC = () => {
  const frame = useCurrentFrame();
  const move = settle(frame, 372, 16);
  // mark: from centred (scale 1) to lockup position
  const markLockX = 462;
  const markLockY = 352;
  const mx = interpolate(move, [0, 1], [MARK_CENTER.x, markLockX]);
  const my = interpolate(move, [0, 1], [MARK_CENTER.y, markLockY]);
  const ms = interpolate(move, [0, 1], [1, LOCK_SCALE]);
  const slabO = ramp(frame, 372, 382, Easing.linear);
  const slabS = 0.97 + 0.03 * settle(frame, 372, 16);

  const wordLeft = markLockX + MARK_W * LOCK_SCALE + 10;
  const baseline = 598; // text baseline y
  const secAt = 396;
  const secRise = ramp(frame, secAt, secAt + 7);
  const secFade = ramp(frame, secAt, secAt + 12, Easing.linear);
  const chipAt = 405;
  const chipS = frame >= chipAt ? pop(frame, chipAt) : 0;
  const chipO = ramp(frame, chipAt, chipAt + 5, Easing.linear);

  const fadeOut = ramp(frame, 444, 450, Easing.linear);
  const dotAt = 376 + 5 * 2 + 4;
  const dotS = frame >= dotAt ? pop(frame, dotAt) : 0;
  const metrics = useMemo(() => measureWord(), []);

  return (
    <AbsoluteFill>
      <Studio />
      {/* slab */}
      <div
        style={{
          position: "absolute",
          left: SLAB.x - SLAB.w / 2,
          top: SLAB.y - SLAB.h / 2,
          width: SLAB.w,
          height: SLAB.h,
          borderRadius: 40,
          background: GROUND,
          border: `1px solid ${FOG}`,
          boxShadow: "0 30px 60px rgba(45,73,100,0.12)",
          opacity: slabO,
          transform: `scale(${slabS})`,
        }}
      />
      {/* thread tail from scene E stays in frame and fades as the lockup assembles */}
      <Thread d={PATH_E} progress={1 - LOOP_FRAC} showHead={false} opacity={1 - ramp(frame, 372, 386, Easing.linear)} />
      <BMark x={mx} y={my} scale={ms} />
      {/* wordmark, letter by letter */}
      <div
        style={{
          position: "absolute",
          left: wordLeft,
          top: baseline - WORD_SIZE * 0.78,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: WORD_SIZE,
          color: NAVY,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          whiteSpace: "nowrap",
          display: "flex",
        }}
      >
        {LETTERS.map((ch, i) => {
          const at = 376 + i * 2; // 60 ms apart
          const r = ramp(frame, at, at + 8);
          const o = ramp(frame, at, at + 6, Easing.linear);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateX(${(1 - r) * -34}px)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      {/* magenta i-dot — lands last */}
      <div
        style={{
          position: "absolute",
          left: wordLeft + metrics.brand + metrics.i / 2 - 21,
          top: baseline - WORD_SIZE * 0.72 - 21,
          width: 42,
          height: 42,
          borderRadius: 21,
          background: MAGENTA,
          transform: `scale(${dotS})`,
        }}
      />
      {/* secondary */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 668,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 30,
          color: FOG,
          opacity: secFade,
          transform: `translateY(${(1 - secRise) * 24}px)`,
        }}
      >
        AI Visibility · Generative Engine Optimization
      </div>
      <Chip x={960} y={762} scale={chipS} opacity={chipO} label="Run a GEO Scan" />
      <AbsoluteFill style={{ background: PAPER, opacity: fadeOut }} />
    </AbsoluteFill>
  );
};
