"use client";

// Token references — resolved per theme via CSS custom properties on :root / .dark.
// Applied via inline `style={{ fill }}` because SVG `fill="..."` attribute does not
// resolve `var(...)` reliably across browsers.
const BG = "var(--lp-bg)";
const ACCENT = "var(--lp-accent)";
const INK = "var(--lp-ink)";
const SOFT = "var(--lp-soft)";

const C = 120; // cell size
const VB = C * 4; // 480

function gx(col: number) {
  return col * C;
}
function gy(row: number) {
  return row * C;
}

function Square({
  x,
  y,
  w = C,
  h = C,
  fill,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill: string;
}) {
  return <rect x={x} y={y} width={w} height={h} style={{ fill }} />;
}

function Circle({
  cx,
  cy,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  return <circle cx={cx} cy={cy} r={r} style={{ fill }} />;
}

function Quarter({
  x,
  y,
  size = C,
  corner,
  fill,
}: {
  x: number;
  y: number;
  size?: number;
  corner: "tl" | "tr" | "bl" | "br";
  fill: string;
}) {
  const r = size;
  let d = "";
  if (corner === "tl") d = `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} Z`;
  if (corner === "tr") d = `M ${x + r} ${y} L ${x + r} ${y + r} A ${r} ${r} 0 0 0 ${x} ${y} Z`;
  if (corner === "bl") d = `M ${x} ${y + r} L ${x} ${y} A ${r} ${r} 0 0 0 ${x + r} ${y + r} Z`;
  if (corner === "br") d = `M ${x + r} ${y + r} L ${x} ${y + r} A ${r} ${r} 0 0 0 ${x + r} ${y} Z`;
  return <path d={d} style={{ fill }} />;
}

function Half({
  x,
  y,
  size = C,
  side,
  fill,
}: {
  x: number;
  y: number;
  size?: number;
  side: "top" | "bottom" | "left" | "right";
  fill: string;
}) {
  const s = size;
  let d = "";
  if (side === "top")
    d = `M ${x} ${y + s / 2} A ${s / 2} ${s / 2} 0 0 1 ${x + s} ${y + s / 2} Z`;
  if (side === "bottom")
    d = `M ${x} ${y + s / 2} A ${s / 2} ${s / 2} 0 0 0 ${x + s} ${y + s / 2} Z`;
  if (side === "left")
    d = `M ${x + s / 2} ${y} A ${s / 2} ${s / 2} 0 0 0 ${x + s / 2} ${y + s} Z`;
  if (side === "right")
    d = `M ${x + s / 2} ${y} A ${s / 2} ${s / 2} 0 0 1 ${x + s / 2} ${y + s} Z`;
  return <path d={d} style={{ fill }} />;
}

function Cross({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <>
      <rect x={x + C * 0.42} y={y + C * 0.18} width={C * 0.16} height={C * 0.64} style={{ fill }} />
      <rect x={x + C * 0.18} y={y + C * 0.42} width={C * 0.64} height={C * 0.16} style={{ fill }} />
    </>
  );
}

export function GeometricComposition({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className={className}
      role="img"
      aria-label="Beespo brand composition: geometric shapes"
      style={{ display: "block" }}
    >
      {/* Backdrop */}
      <Square x={0} y={0} w={VB} h={VB} fill={BG} />

      {/* Row 0 */}
      <Square x={gx(0)} y={gy(0)} fill={INK} />
      <Quarter x={gx(1)} y={gy(0)} corner="tl" fill={INK} />
      <Square x={gx(2)} y={gy(0)} fill={ACCENT} />
      <Quarter x={gx(3)} y={gy(0)} corner="tr" fill={INK} />

      {/* Row 1 */}
      <Quarter x={gx(0)} y={gy(1)} corner="bl" fill={INK} />
      <Square x={gx(1)} y={gy(1)} fill={ACCENT} />
      <Circle cx={gx(2) + C / 2} cy={gy(1) + C / 2} r={C * 0.36} fill={INK} />
      <Square x={gx(3)} y={gy(1)} fill={SOFT} />

      {/* Row 2 */}
      <Square x={gx(0)} y={gy(2)} fill={SOFT} />
      <Half x={gx(1)} y={gy(2)} side="right" fill={ACCENT} />
      <Square x={gx(2)} y={gy(2)} fill={INK} />
      <Half x={gx(3)} y={gy(2)} side="left" fill={BG} />
      <Circle cx={gx(2) + C / 2} cy={gy(2) + C / 2} r={C * 0.14} fill={ACCENT} />

      {/* Row 3 */}
      <Half x={gx(0)} y={gy(3)} side="top" fill={SOFT} />
      <Square x={gx(1)} y={gy(3)} fill={INK} />
      <Square x={gx(2)} y={gy(3)} fill={ACCENT} />
      <Cross x={gx(2)} y={gy(3)} fill={BG} />
      <Circle cx={gx(3) + C / 2} cy={gy(3) + C / 2} r={C * 0.42} fill={INK} />
      <Circle cx={gx(3) + C / 2} cy={gy(3) + C / 2} r={C * 0.18} fill={BG} />

      {/* Detail accent */}
      <Circle cx={gx(3) + C * 0.72} cy={gy(1) + C * 0.28} r={C * 0.08} fill={BG} />
    </svg>
  );
}
