import type { ReactNode } from "react";

export const ACCENT = "var(--lp-accent)";
export const INK = "var(--lp-ink)";
export const SOFT = "var(--lp-soft)";
export const BG = "var(--lp-bg)";
export const SURFACE = "var(--lp-surface)";

/** Cell size and grid dimensions used by every auth mural. */
export const C = 120;
export const COLS = 4;
export const ROWS = 5;
export const VW = COLS * C;
export const VH = ROWS * C;

/**
 * Mural color wash: every shape fill is mixed toward `--lp-surface` so the
 * murals recede behind the headline/form. 100 = original strength, 0 = pure
 * surface (invisible). Tune this value to dial the murals up or down across
 * all auth pages at once.
 */
const MURAL_STRENGTH = 65;

function wash(color: string): string {
  return `color-mix(in srgb, ${color} ${MURAL_STRENGTH}%, var(--lp-surface))`;
}

/** Solid square (or rectangle, when span > 1). */
export function Cell({
  col,
  row,
  fill,
  span = 1,
  spanY = 1,
}: {
  col: number;
  row: number;
  fill: string;
  span?: number;
  spanY?: number;
}) {
  return (
    <rect
      x={col * C}
      y={row * C}
      width={C * span}
      height={C * spanY}
      style={{ fill: wash(fill) }}
    />
  );
}

/** Quarter-circle wedge filling the named corner of a single cell. */
export function Wedge({
  col,
  row,
  corner,
  fill,
}: {
  col: number;
  row: number;
  corner: "tl" | "tr" | "bl" | "br";
  fill: string;
}) {
  const x = col * C;
  const y = row * C;
  let d = "";
  if (corner === "tl")
    d = `M ${x} ${y} L ${x + C} ${y} A ${C} ${C} 0 0 0 ${x} ${y + C} Z`;
  if (corner === "tr")
    d = `M ${x + C} ${y} L ${x + C} ${y + C} A ${C} ${C} 0 0 0 ${x} ${y} Z`;
  if (corner === "bl")
    d = `M ${x} ${y + C} L ${x} ${y} A ${C} ${C} 0 0 0 ${x + C} ${y + C} Z`;
  if (corner === "br")
    d = `M ${x + C} ${y + C} L ${x} ${y + C} A ${C} ${C} 0 0 0 ${x + C} ${y} Z`;
  return <path d={d} style={{ fill: wash(fill) }} />;
}

/** Half-circle attached to the named edge of a cell. */
export function Half({
  col,
  row,
  side,
  fill,
}: {
  col: number;
  row: number;
  side: "top" | "bottom" | "left" | "right";
  fill: string;
}) {
  const x = col * C;
  const y = row * C;
  let d = "";
  if (side === "top")
    d = `M ${x} ${y + C / 2} A ${C / 2} ${C / 2} 0 0 1 ${x + C} ${y + C / 2} Z`;
  if (side === "bottom")
    d = `M ${x} ${y + C / 2} A ${C / 2} ${C / 2} 0 0 0 ${x + C} ${y + C / 2} Z`;
  if (side === "left")
    d = `M ${x + C / 2} ${y} A ${C / 2} ${C / 2} 0 0 0 ${x + C / 2} ${y + C} Z`;
  if (side === "right")
    d = `M ${x + C / 2} ${y} A ${C / 2} ${C / 2} 0 0 1 ${x + C / 2} ${y + C} Z`;
  return <path d={d} style={{ fill: wash(fill) }} />;
}

/** Plus mark centered in a cell. */
export function Plus({
  col,
  row,
  fill,
}: {
  col: number;
  row: number;
  fill: string;
}) {
  const x = col * C;
  const y = row * C;
  return (
    <>
      <rect
        x={x + C * 0.42}
        y={y + C * 0.18}
        width={C * 0.16}
        height={C * 0.64}
        style={{ fill: wash(fill) }}
      />
      <rect
        x={x + C * 0.18}
        y={y + C * 0.42}
        width={C * 0.64}
        height={C * 0.16}
        style={{ fill: wash(fill) }}
      />
    </>
  );
}

/** Circle centered in a cell. */
export function CircleAt({
  col,
  row,
  r,
  fill,
}: {
  col: number;
  row: number;
  r: number;
  fill: string;
}) {
  return (
    <circle
      cx={(col + 0.5) * C}
      cy={(row + 0.5) * C}
      r={r}
      style={{ fill: wash(fill) }}
    />
  );
}

/**
 * SVG container that fills its parent. `xMaxYMid slice` keeps the right
 * edge sharp against the text column while letting the left edge bleed.
 */
export function Mural({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMaxYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Beespo brand composition"
    >
      <rect width={VW} height={VH} style={{ fill: SURFACE }} />
      {children}
    </svg>
  );
}
