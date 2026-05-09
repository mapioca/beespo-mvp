import { AuthSidePanel, AccentItalic } from "@/components/auth/auth-two-pane";
import {
  Mural,
  Cell,
  Wedge,
  Half,
  Plus,
  CircleAt,
  C,
  ACCENT,
  INK,
  SOFT,
  BG,
} from "@/components/auth/shapes";

/**
 * Signup mural — leans warmer than login. More accent presence, a left-edge
 * focal accent block (the "doorway") with a cream half-circle, and softer
 * curves to read as an invitation.
 */
export function SignupSidePanel() {
  return (
    <AuthSidePanel
      headline={
        <>
          A new chapter,{" "}
          <AccentItalic>not a blank page.</AccentItalic>
        </>
      }
      subtext="A quiet operating system for bishoprics and presidencies."
    >
      <Mural>
        {/* Row 0 */}
        <Cell col={0} row={0} fill={SOFT} />
        <Cell col={1} row={0} fill={INK} />
        <Wedge col={2} row={0} corner="bl" fill={ACCENT} />
        <Cell col={3} row={0} fill={INK} />

        {/* Tall accent doorway: leftmost col, rows 1–3, with cream half-circle */}
        <Cell col={0} row={1} fill={ACCENT} spanY={3} />
        <Half col={0} row={2} side="right" fill={BG} />
        <CircleAt col={0} row={2} r={C * 0.12} fill={ACCENT} />

        {/* Row 1 (cols 1–3) */}
        <Cell col={1} row={1} fill={SOFT} />
        <Cell col={2} row={1} fill={INK} />
        <Wedge col={3} row={1} corner="tl" fill={ACCENT} />

        {/* Row 2 (cols 1–3) */}
        <Wedge col={1} row={2} corner="br" fill={INK} />
        <Cell col={2} row={2} fill={ACCENT} />
        <Plus col={2} row={2} fill={BG} />
        <Cell col={3} row={2} fill={SOFT} />

        {/* Row 3 (cols 1–3) */}
        <Cell col={1} row={3} fill={ACCENT} />
        <Half col={2} row={3} side="top" fill={INK} />
        <Cell col={3} row={3} fill={INK} />

        {/* Row 4 */}
        <Cell col={0} row={4} fill={INK} />
        <Wedge col={1} row={4} corner="tr" fill={ACCENT} />
        <Cell col={2} row={4} fill={SOFT} />
        <Cell col={3} row={4} fill={ACCENT} />
      </Mural>
    </AuthSidePanel>
  );
}
