import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
} from "remotion";
import { getLength, getPointAtLength } from "@remotion/paths";
import {
  CARD_RADIUS,
  CARD_SHADOW,
  CARD_SHADOW_LIT,
  CYAN,
  FOG,
  FONT,
  FPS,
  GHOST,
  GROUND,
  H,
  MAGENTA,
  NAVY,
  PAPER,
  W,
} from "./theme";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** ease-out ramp between two frames */
export const ramp = (frame: number, from: number, to: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** critically damped spring (no overshoot) */
export const settle = (frame: number, delay: number, durationInFrames = 18) =>
  spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 200, stiffness: 170, mass: 1 },
    durationInFrames,
  });

/** soft spring with <3% overshoot */
export const pop = (frame: number, delay: number) =>
  spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 16, stiffness: 150, mass: 0.9 },
  });

/** first progress fraction at which the path head crosses y (moving in dir) inside x range */
export const progressAtY = (
  d: string,
  y: number,
  xMin: number,
  xMax: number,
  dir: "up" | "down"
) => {
  const L = getLength(d);
  const N = 600;
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const pt = getPointAtLength(d, p * L);
    if (!pt) continue;
    if (pt.x >= xMin && pt.x <= xMax) {
      if (dir === "up" && pt.y <= y) return p;
      if (dir === "down" && pt.y >= y) return p;
    }
  }
  return 1.01;
};

export const headPoint = (d: string, p: number) =>
  getPointAtLength(d, clamp01(p) * getLength(d)) ?? { x: 0, y: 0 };

/* ------------------------------------------------------------------ */
/* camera                                                              */
/* ------------------------------------------------------------------ */

export type CamKey = { f: number; x: number; y: number; s: number };

export const useCamera = (frame: number, keys: CamKey[]) => {
  const fs = keys.map((k) => k.f);
  const opts = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.inOut(Easing.cubic),
  };
  const x = interpolate(frame, fs, keys.map((k) => k.x), opts);
  const y = interpolate(frame, fs, keys.map((k) => k.y), opts);
  const s = interpolate(frame, fs, keys.map((k) => k.s), opts);
  return { x, y, s };
};

export const Camera: React.FC<{
  cam: { x: number; y: number; s: number };
  children: React.ReactNode;
}> = ({ cam, children }) => (
  <AbsoluteFill
    style={{
      transformOrigin: "0 0",
      transform: `translate(${W / 2 - cam.s * cam.x}px, ${H / 2 - cam.s * cam.y}px) scale(${cam.s})`,
    }}
  >
    {children}
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* background                                                          */
/* ------------------------------------------------------------------ */

export const Studio: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER} 58%, ${GROUND} 100%)`,
    }}
  />
);

/* ------------------------------------------------------------------ */
/* the signal thread                                                   */
/* ------------------------------------------------------------------ */

export const Thread: React.FC<{
  d: string;
  progress: number;
  width?: number;
  showHead?: boolean;
  opacity?: number;
}> = ({ d, progress, width = 3, showHead = true, opacity = 1 }) => {
  const p = clamp01(progress);
  const head = useMemo(() => headPoint(d, p), [d, p]);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}
    >
      {/* 2px soft edge: a slightly wider, translucent underline of the same flat colour */}
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={MAGENTA}
        strokeWidth={width + 2}
        strokeOpacity={0.28}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${p} 1`}
      />
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={MAGENTA}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${p} 1`}
      />
      {showHead && p > 0 && p < 1 ? <circle cx={head.x} cy={head.y} r={5} fill={MAGENTA} /> : null}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* answer cards                                                        */
/* ------------------------------------------------------------------ */

export type LineSpec = { w: number; indent?: number };

export const greek = (n: number, seed = 1): LineSpec[] => {
  const out: LineSpec[] = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    out.push({ w: 0.55 + r * 0.42 });
  }
  return out;
};

/** A white answer card with greeked text lines. `lit[i]` is 0..1 per line. */
export const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  lines: LineSpec[];
  lit?: number[];
  magentaIndex?: number;
  settleAmount?: number; // 0..1 → 2% scale + deeper shadow
  opacity?: number;
  blur?: number;
  lineHeight?: number;
  avatar?: boolean;
  scale?: number;
}> = ({
  x,
  y,
  w,
  h,
  lines,
  lit,
  magentaIndex = -1,
  settleAmount = 0,
  opacity = 1,
  blur = 0,
  lineHeight,
  avatar = false,
  scale = 1,
}) => {
  const pad = Math.round(h * 0.11);
  const lh = lineHeight ?? Math.max(6, Math.round((h - pad * 2) / (lines.length * 1.9)));
  const gap = Math.round(lh * 0.9);
  const sc = scale * (1 + 0.02 * settleAmount);
  const shadow = settleAmount > 0.01 ? CARD_SHADOW_LIT : CARD_SHADOW;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: CARD_RADIUS,
        background: PAPER,
        border: `1px solid ${FOG}`,
        boxShadow: shadow,
        opacity,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: `scale(${sc})`,
        padding: pad,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      {avatar ? (
        <div
          style={{
            width: lh * 3.2,
            height: lh * 3.2,
            borderRadius: lh * 0.8,
            background: GHOST,
            marginBottom: gap,
          }}
        />
      ) : null}
      {lines.map((ln, i) => {
        const l = lit?.[i] ?? 0;
        const color =
          i === magentaIndex
            ? interpolateColors(l, [0, 1], [GHOST, MAGENTA])
            : interpolateColors(l, [0, 1], [GHOST, NAVY]);
        return (
          <div
            key={i}
            style={{
              height: lh,
              width: `${ln.w * 100}%`,
              marginLeft: ln.indent ? `${ln.indent * 100}%` : 0,
              borderRadius: lh / 2,
              background: color,
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* type                                                                */
/* ------------------------------------------------------------------ */

/** Headline with exactly one accent word. `at` = frame the line rises. */
export const Headline: React.FC<{
  text: string;
  accent: string;
  at: number;
  y?: number;
  size?: number;
  secondary?: string;
  secondaryAt?: number;
}> = ({ text, accent, at, y = 905, size = 64, secondary, secondaryAt }) => {
  const frame = useCurrentFrame();
  const rise = ramp(frame, at, at + 7); // 220ms ease-out
  const fade = ramp(frame, at, at + 12, Easing.linear); // 12-frame opacity ramp
  if (frame < at) return null;
  const idx = text.indexOf(accent);
  const before = idx >= 0 ? text.slice(0, idx) : text;
  const after = idx >= 0 ? text.slice(idx + accent.length) : "";
  const sAt = secondaryAt ?? at + 6;
  const sRise = ramp(frame, sAt, sAt + 7);
  const sFade = ramp(frame, sAt, sAt + 12, Easing.linear);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 800,
          color: NAVY,
          letterSpacing: "-0.015em",
          lineHeight: 1.1,
          opacity: fade,
          transform: `translateY(${(1 - rise) * 24}px)`,
        }}
      >
        {before}
        <span style={{ color: MAGENTA }}>{idx >= 0 ? accent : ""}</span>
        {after}
      </div>
      {secondary && frame >= sAt ? (
        <div
          style={{
            marginTop: size * 0.28,
            fontSize: size * 0.4,
            fontWeight: 500,
            color: FOG,
            letterSpacing: "0.005em",
            opacity: sFade,
            transform: `translateY(${(1 - sRise) * 24}px)`,
          }}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* the brandi mark                                                     */
/* ------------------------------------------------------------------ */

export const MARK_W = 320;
export const MARK_H = 400;
// local geometry (box 320 x 400)
export const MARK_STEM_X = 62;
export const MARK_STEM_TOP = 92;
export const MARK_STEM_BOTTOM = 362;
export const MARK_STROKE = 58;
export const MARK_BOWL_C = { x: 168, y: 285 };
export const MARK_BOWL_R = 78;
export const MARK_LOOP_C = { x: 176, y: 108 };
export const MARK_LOOP_R = 52;
export const MARK_LOOP_STROKE = 58;
export const MARK_DOT = { x: 122, y: 198, r: 27 };

export const bowlPath = () => {
  const { x, y } = MARK_BOWL_C;
  const r = MARK_BOWL_R;
  // start at the left of the bowl (on the stem), go clockwise over the top and back
  return `M ${x - r} ${y} A ${r} ${r} 0 1 1 ${x + r} ${y} A ${r} ${r} 0 1 1 ${x - r} ${y}`;
};
export const loopPath = () => {
  const { x, y } = MARK_LOOP_C;
  const r = MARK_LOOP_R;
  return `M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x - 0.01} ${y - r}`;
};

/**
 * b mark. All draw params 0..1.
 * loopWidth: thread (3px) → full loop stroke.
 */
export const BMark: React.FC<{
  x: number; // world position of the box's top-left
  y: number;
  scale?: number;
  loopDraw?: number;
  loopWidth?: number;
  stemDraw?: number;
  bowlDraw?: number;
  dot?: number;
  opacity?: number;
}> = ({ x, y, scale = 1, loopDraw = 1, loopWidth = 1, stemDraw = 1, bowlDraw = 1, dot = 1, opacity = 1 }) => {
  const lw = 3 + (MARK_LOOP_STROKE - 3) * clamp01(loopWidth);
  return (
    <svg
      width={MARK_W}
      height={MARK_H}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        overflow: "visible",
        transformOrigin: "0 0",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {stemDraw > 0 ? (
        <path
          d={`M ${MARK_STEM_X} ${MARK_STEM_TOP} L ${MARK_STEM_X} ${MARK_STEM_BOTTOM}`}
          pathLength={1}
          stroke={NAVY}
          strokeWidth={MARK_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${clamp01(stemDraw)} 1`}
        />
      ) : null}
      {bowlDraw > 0 ? (
        <path
          d={bowlPath()}
          pathLength={1}
          stroke={NAVY}
          strokeWidth={MARK_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${clamp01(bowlDraw)} 1`}
        />
      ) : null}
      {loopDraw > 0 ? (
        <path
          d={loopPath()}
          pathLength={1}
          stroke={MAGENTA}
          strokeWidth={lw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${clamp01(loopDraw)} 1`}
        />
      ) : null}
      {dot > 0 ? (
        <g transform={`translate(${MARK_DOT.x} ${MARK_DOT.y}) scale(${dot})`}>
          <circle r={MARK_DOT.r} fill={CYAN} />
          <circle r={MARK_DOT.r * 0.42} fill={PAPER} />
        </g>
      ) : null}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* CTA chip                                                            */
/* ------------------------------------------------------------------ */

export const Chip: React.FC<{ x: number; y: number; scale: number; opacity: number; label: string }> = ({
  x,
  y,
  scale,
  opacity,
  label,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${scale})`,
      opacity,
      background: MAGENTA,
      color: PAPER,
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: 30,
      padding: "18px 44px",
      borderRadius: 999,
      whiteSpace: "nowrap",
      letterSpacing: "-0.005em",
    }}
  >
    {label}
  </div>
);
