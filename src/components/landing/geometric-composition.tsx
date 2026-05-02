"use client";

const CREAM = "var(--brand-cream)";
const BURNT = "var(--brand-burnt)";
const WALNUT = "var(--brand-walnut)";
const TAUPE = "var(--brand-taupe)";

const C = 120; // cell size
const VB = C * 4; // 480

function gx(col: number) {
  return col * C;
}
function gy(row: number) {
  return row * C;
}

// Shape helpers (origin = top-left of cell, size = w x h)
function Square({ x, y, w = C, h = C, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

function Circle({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} />;
}

// Quarter circle filling a cell-sized arc. corner = where the arc's pivot is.
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
  return <path d={d} fill={fill} />;
}

// Half circle within a cell. side = which side of the cell the flat edge sits on.
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
  return <path d={d} fill={fill} />;
}

function Cross({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <>
      <rect x={x + C * 0.42} y={y + C * 0.18} width={C * 0.16} height={C * 0.64} fill={fill} />
      <rect x={x + C * 0.18} y={y + C * 0.42} width={C * 0.64} height={C * 0.16} fill={fill} />
    </>
  );
}

export function GeometricComposition({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className={className}
      role="img"
      aria-label="Beespo brand composition: geometric shapes in cream, burnt orange, walnut, and taupe"
      style={{ display: "block" }}
    >
      {/* Cream backdrop */}
      <Square x={0} y={0} w={VB} h={VB} fill={CREAM} />

      {/* Row 0 */}
      {/* (0,0) walnut filled */}
      <Square x={gx(0)} y={gy(0)} fill={WALNUT} />
      {/* (0,1) cream cell with walnut quarter pivoting at top-left → forms 3/4 disc with (0,0) */}
      <Quarter x={gx(1)} y={gy(0)} corner="tl" fill={WALNUT} />
      {/* (0,2) burnt filled */}
      <Square x={gx(2)} y={gy(0)} fill={BURNT} />
      {/* (0,3) cream cell with walnut quarter pivoting at top-right → arc opens toward (0,2) */}
      <Quarter x={gx(3)} y={gy(0)} corner="tr" fill={WALNUT} />

      {/* Row 1 */}
      {/* (1,0) cream cell with walnut quarter pivoting at bottom-left — completes a 4-quadrant pinwheel anchored at the column 1 corner */}
      <Quarter x={gx(0)} y={gy(1)} corner="bl" fill={WALNUT} />
      {/* (1,1) burnt filled */}
      <Square x={gx(1)} y={gy(1)} fill={BURNT} />
      {/* (1,2) cream + walnut centered circle */}
      <Circle cx={gx(2) + C / 2} cy={gy(1) + C / 2} r={C * 0.36} fill={WALNUT} />
      {/* (1,3) taupe filled */}
      <Square x={gx(3)} y={gy(1)} fill={TAUPE} />

      {/* Row 2 */}
      {/* (2,0) taupe filled */}
      <Square x={gx(0)} y={gy(2)} fill={TAUPE} />
      {/* (2,1) cream + burnt half circle on right edge → forms continuous half with (2,2) */}
      <Half x={gx(1)} y={gy(2)} side="right" fill={BURNT} />
      {/* (2,2) walnut filled */}
      <Square x={gx(2)} y={gy(2)} fill={WALNUT} />
      {/* (2,3) cream + walnut half on left → leaf-like with (2,2) */}
      <Half x={gx(3)} y={gy(2)} side="left" fill={CREAM} />
      {/* small burnt accent inside the walnut block at (2,2) */}
      <Circle cx={gx(2) + C / 2} cy={gy(2) + C / 2} r={C * 0.14} fill={BURNT} />

      {/* Row 3 */}
      {/* (3,0) cream + taupe half-top → forms full circle column with (2,0) taupe */}
      <Half x={gx(0)} y={gy(3)} side="top" fill={TAUPE} />
      {/* (3,1) walnut filled */}
      <Square x={gx(1)} y={gy(3)} fill={WALNUT} />
      {/* (3,2) burnt filled with cream cross */}
      <Square x={gx(2)} y={gy(3)} fill={BURNT} />
      <Cross x={gx(2)} y={gy(3)} fill={CREAM} />
      {/* (3,3) cream + walnut donut */}
      <Circle cx={gx(3) + C / 2} cy={gy(3) + C / 2} r={C * 0.42} fill={WALNUT} />
      <Circle cx={gx(3) + C / 2} cy={gy(3) + C / 2} r={C * 0.18} fill={CREAM} />

      {/* Detail accent: small burnt dot inside (1,3) taupe block */}
      <Circle cx={gx(3) + C * 0.72} cy={gy(1) + C * 0.28} r={C * 0.08} fill={CREAM} />
    </svg>
  );
}
