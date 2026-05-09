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

export function LoginSidePanel() {
  return (
    <AuthSidePanel
      headline={
        <>
          Magnify the calling,{" "}
          <AccentItalic>not the calendar.</AccentItalic>
        </>
      }
      subtext="Less time on logistics, more on the people you watch over."
    >
      <Mural>
        {/* Row 0 */}
        <Cell col={0} row={0} fill={INK} />
        <Wedge col={1} row={0} corner="br" fill={ACCENT} />
        <Cell col={2} row={0} fill={INK} />
        <CircleAt col={2} row={0} r={C * 0.18} fill={BG} />
        <Cell col={3} row={0} fill={SOFT} />

        {/* Row 1 — focal column on the right starts here */}
        <Cell col={0} row={1} fill={ACCENT} />
        <Wedge col={1} row={1} corner="bl" fill={INK} />
        <Cell col={2} row={1} fill={BG} />

        {/* Tall ink block: rightmost column, rows 1–3, with cream donut + accent core */}
        <Cell col={3} row={1} fill={INK} spanY={3} />
        <CircleAt col={3} row={2} r={C * 0.42} fill={BG} />
        <CircleAt col={3} row={2} r={C * 0.16} fill={ACCENT} />

        {/* Row 2 */}
        <Cell col={0} row={2} fill={SOFT} />
        <Half col={1} row={2} side="right" fill={SOFT} />
        <Cell col={2} row={2} fill={ACCENT} />
        <Plus col={2} row={2} fill={BG} />

        {/* Row 3 */}
        <Half col={0} row={3} side="top" fill={ACCENT} />
        <Cell col={1} row={3} fill={INK} />
        <Cell col={2} row={3} fill={SOFT} />

        {/* Row 4 */}
        <Cell col={0} row={4} fill={INK} />
        <Cell col={1} row={4} fill={ACCENT} />
        <Wedge col={2} row={4} corner="tl" fill={INK} />
        <Cell col={3} row={4} fill={SOFT} />
      </Mural>
    </AuthSidePanel>
  );
}
