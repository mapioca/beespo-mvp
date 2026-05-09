import Link from "next/link";

const ACCENT = "var(--lp-accent)";
const INK = "var(--lp-ink)";
const SOFT = "var(--lp-soft)";
const BG = "var(--lp-bg)";

/**
 * Decorative left pane for the login page. The shape mural is the visual
 * lead: large, edge-to-edge tiles in the brand palette, with text content
 * sitting in the right column adjacent to the form.
 */
export function LoginSidePanel() {
  return (
    <aside
      className="relative hidden lg:grid grid-cols-[1.1fr_1fr] overflow-hidden"
      style={{ background: "var(--lp-surface)" }}
    >
      {/* Mural — left column, full bleed */}
      <div className="relative overflow-hidden">
        <ShapeMural />
      </div>

      {/* Text — right column */}
      <div className="relative flex flex-col justify-between p-10 xl:p-14">
        <header>
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight transition-opacity hover:opacity-80"
            style={{ color: INK }}
          >
            Beespo
          </Link>
        </header>

        <div className="max-w-md">
          <h1
            className="font-bold tracking-tighter"
            style={{
              color: INK,
              fontSize: "clamp(2rem, 2.8vw + 1rem, 3.25rem)",
              lineHeight: 1.05,
            }}
          >
            Magnify the calling,{" "}
            <span
              className="italic"
              style={{
                color: ACCENT,
                fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
                fontWeight: 500,
              }}
            >
              not the calendar.
            </span>
          </h1>

          <p
            className="mt-5 text-base leading-relaxed"
            style={{
              color: "color-mix(in srgb, var(--lp-ink) 75%, transparent)",
            }}
          >
            Less time on logistics, more on the people you watch over.
          </p>
        </div>

        <footer
          className="text-xs"
          style={{
            color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)",
          }}
        >
          © {new Date().getFullYear()} Beespo · Built for the bishopric
        </footer>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Shape primitives — same vocabulary as the landing GeometricComposition,
   reused at a larger scale. Cells are 120px on a 4-col × 5-row grid; the
   SVG fills its container with `xMaxYMid slice` so the right edge stays
   sharp against the text column while the left edge can bleed.
   ──────────────────────────────────────────────────────────────────────── */

const C = 120;
const COLS = 4;
const ROWS = 5;
const VW = COLS * C;
const VH = ROWS * C;

function Wedge({
  x,
  y,
  corner,
  fill,
}: {
  x: number;
  y: number;
  corner: "tl" | "tr" | "bl" | "br";
  fill: string;
}) {
  let d = "";
  if (corner === "tl")
    d = `M ${x} ${y} L ${x + C} ${y} A ${C} ${C} 0 0 0 ${x} ${y + C} Z`;
  if (corner === "tr")
    d = `M ${x + C} ${y} L ${x + C} ${y + C} A ${C} ${C} 0 0 0 ${x} ${y} Z`;
  if (corner === "bl")
    d = `M ${x} ${y + C} L ${x} ${y} A ${C} ${C} 0 0 0 ${x + C} ${y + C} Z`;
  if (corner === "br")
    d = `M ${x + C} ${y + C} L ${x} ${y + C} A ${C} ${C} 0 0 0 ${x + C} ${y} Z`;
  return <path d={d} style={{ fill }} />;
}

function Half({
  x,
  y,
  side,
  fill,
}: {
  x: number;
  y: number;
  side: "top" | "bottom" | "left" | "right";
  fill: string;
}) {
  let d = "";
  if (side === "top")
    d = `M ${x} ${y + C / 2} A ${C / 2} ${C / 2} 0 0 1 ${x + C} ${y + C / 2} Z`;
  if (side === "bottom")
    d = `M ${x} ${y + C / 2} A ${C / 2} ${C / 2} 0 0 0 ${x + C} ${y + C / 2} Z`;
  if (side === "left")
    d = `M ${x + C / 2} ${y} A ${C / 2} ${C / 2} 0 0 0 ${x + C / 2} ${y + C} Z`;
  if (side === "right")
    d = `M ${x + C / 2} ${y} A ${C / 2} ${C / 2} 0 0 1 ${x + C / 2} ${y + C} Z`;
  return <path d={d} style={{ fill }} />;
}

function Plus({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <>
      <rect
        x={x + C * 0.42}
        y={y + C * 0.18}
        width={C * 0.16}
        height={C * 0.64}
        style={{ fill }}
      />
      <rect
        x={x + C * 0.18}
        y={y + C * 0.42}
        width={C * 0.64}
        height={C * 0.16}
        style={{ fill }}
      />
    </>
  );
}

function Cell({
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
      style={{ fill }}
    />
  );
}

function ShapeMural() {
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMaxYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Beespo brand composition"
    >
      {/* Backdrop matches the pane so any sliced area blends seamlessly */}
      <rect width={VW} height={VH} style={{ fill: "var(--lp-surface)" }} />

      {/* Row 0 ─────────────────────────────────────────────── */}
      <Cell col={0} row={0} fill={INK} />
      <Wedge x={C} y={0} corner="br" fill={ACCENT} />
      <Cell col={2} row={0} fill={INK} />
      <circle cx={2.5 * C} cy={0.5 * C} r={C * 0.18} style={{ fill: BG }} />
      <Cell col={3} row={0} fill={SOFT} />

      {/* Row 1 ─────────────────────────────────────────────── */}
      <Cell col={0} row={1} fill={ACCENT} />
      <Wedge x={C} y={C} corner="bl" fill={INK} />
      <Cell col={2} row={1} fill={BG} />

      {/* Tall ink block: rightmost column, rows 1–3, with a cream donut and
          accent core — the focal element of the mural. */}
      <Cell col={3} row={1} fill={INK} spanY={3} />
      <circle cx={3.5 * C} cy={2.5 * C} r={C * 0.42} style={{ fill: BG }} />
      <circle cx={3.5 * C} cy={2.5 * C} r={C * 0.16} style={{ fill: ACCENT }} />

      {/* Row 2 ─────────────────────────────────────────────── */}
      <Cell col={0} row={2} fill={SOFT} />
      <Half x={C} y={2 * C} side="right" fill={SOFT} />
      <Cell col={2} row={2} fill={ACCENT} />
      <Plus x={2 * C} y={2 * C} fill={BG} />

      {/* Row 3 ─────────────────────────────────────────────── */}
      <Half x={0} y={3 * C} side="top" fill={ACCENT} />
      <Cell col={1} row={3} fill={INK} />
      <Cell col={2} row={3} fill={SOFT} />

      {/* Row 4 ─────────────────────────────────────────────── */}
      <Cell col={0} row={4} fill={INK} />
      <Cell col={1} row={4} fill={ACCENT} />
      <Wedge x={2 * C} y={4 * C} corner="tl" fill={INK} />
      <Cell col={3} row={4} fill={SOFT} />
    </svg>
  );
}
