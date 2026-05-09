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
 * MFA verify mural — tighter and more ink-dominant for a sense of gravitas.
 * A centered concentric-circle "lock" sits at the focal point, with a small
 * accent core, signalling the second factor about to be entered.
 */
export function MfaVerifySidePanel() {
  return (
    <AuthSidePanel
      headline={
        <>
          Almost in,{" "}
          <AccentItalic>one more lock.</AccentItalic>
        </>
      }
      subtext="Two factors keep your bishopric's records yours."
    >
      <Mural>
        {/* Row 0 */}
        <Cell col={0} row={0} fill={INK} />
        <Cell col={1} row={0} fill={SOFT} />
        <Cell col={2} row={0} fill={INK} />
        <Wedge col={3} row={0} corner="br" fill={ACCENT} />

        {/* Row 1 */}
        <Wedge col={0} row={1} corner="tr" fill={INK} />
        <Cell col={1} row={1} fill={ACCENT} />
        <Cell col={2} row={1} fill={INK} />
        <Cell col={3} row={1} fill={SOFT} />

        {/* Row 2 — focal "lock": cream square with concentric circles, accent core */}
        <Cell col={0} row={2} fill={SOFT} />
        <Cell col={1} row={2} fill={INK} />
        <Cell col={2} row={2} fill={BG} />
        <CircleAt col={2} row={2} r={C * 0.42} fill={INK} />
        <CircleAt col={2} row={2} r={C * 0.26} fill={BG} />
        <CircleAt col={2} row={2} r={C * 0.12} fill={ACCENT} />
        <Cell col={3} row={2} fill={INK} />
        <Plus col={3} row={2} fill={BG} />

        {/* Row 3 */}
        <Cell col={0} row={3} fill={INK} />
        <Wedge col={1} row={3} corner="bl" fill={ACCENT} />
        <Cell col={2} row={3} fill={INK} />
        <Half col={3} row={3} side="left" fill={SOFT} />

        {/* Row 4 */}
        <Cell col={0} row={4} fill={ACCENT} />
        <Cell col={1} row={4} fill={INK} />
        <Cell col={2} row={4} fill={SOFT} />
        <Cell col={3} row={4} fill={INK} />
      </Mural>
    </AuthSidePanel>
  );
}
