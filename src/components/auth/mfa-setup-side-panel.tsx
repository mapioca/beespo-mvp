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
 * MFA setup mural — open and balanced. A diagonal accent thread runs from
 * the top-left toward the bottom-right plus mark, suggesting "pairing in
 * progress." Lighter than the verify mural; more breathing room.
 */
export function MfaSetupSidePanel() {
  return (
    <AuthSidePanel
      headline={
        <>
          Add a second key,{" "}
          <AccentItalic>just once.</AccentItalic>
        </>
      }
      subtext="Pair an authenticator app to add a second factor — under a minute, then you're set."
    >
      <Mural>
        {/* Row 0 */}
        <Cell col={0} row={0} fill={ACCENT} />
        <Wedge col={1} row={0} corner="br" fill={INK} />
        <Cell col={2} row={0} fill={SOFT} />
        <Cell col={3} row={0} fill={INK} />

        {/* Row 1 */}
        <Cell col={0} row={1} fill={INK} />
        <Cell col={1} row={1} fill={ACCENT} />
        <CircleAt col={1} row={1} r={C * 0.3} fill={BG} />
        <CircleAt col={1} row={1} r={C * 0.12} fill={ACCENT} />
        <Half col={2} row={1} side="bottom" fill={INK} />
        <Cell col={3} row={1} fill={SOFT} />

        {/* Row 2 */}
        <Half col={0} row={2} side="right" fill={ACCENT} />
        <Cell col={1} row={2} fill={SOFT} />
        <Cell col={2} row={2} fill={INK} />
        <Cell col={3} row={2} fill={ACCENT} />

        {/* Row 3 */}
        <Cell col={0} row={3} fill={SOFT} />
        <Wedge col={1} row={3} corner="tl" fill={INK} />
        <Cell col={2} row={3} fill={ACCENT} />
        <Cell col={3} row={3} fill={INK} />

        {/* Row 4 — accent terminus with plus mark */}
        <Cell col={0} row={4} fill={INK} />
        <Cell col={1} row={4} fill={SOFT} />
        <Cell col={2} row={4} fill={ACCENT} />
        <Plus col={2} row={4} fill={BG} />
        <Cell col={3} row={4} fill={INK} />
      </Mural>
    </AuthSidePanel>
  );
}
