import { AuthSidePanel, AccentItalic } from "@/components/auth/auth-two-pane";
import {
  Mural,
  Cell,
  Wedge,
  Half,
  CircleAt,
  C,
  ACCENT,
  INK,
  SOFT,
  BG,
} from "@/components/auth/shapes";

/**
 * Check-email mural — evokes an envelope mid-transit. Top-right wedge as the
 * envelope flap, an accent circle as the postal stamp, a quiet "in motion"
 * arrow rhythm in the lower rows.
 */
export function CheckEmailSidePanel() {
  return (
    <AuthSidePanel
      headline={
        <>
          Almost there.{" "}
          <AccentItalic>One last tap.</AccentItalic>
        </>
      }
      subtext="We just sent you a confirmation link. Open it from any device to finish setting up your account."
    >
      <Mural>
        {/* Row 0 — postal-stamp seal sits top-right */}
        <Cell col={0} row={0} fill={INK} />
        <Cell col={1} row={0} fill={SOFT} />
        <Wedge col={2} row={0} corner="br" fill={ACCENT} />
        <Cell col={3} row={0} fill={ACCENT} />
        <CircleAt col={3} row={0} r={C * 0.18} fill={BG} />

        {/* Row 1 — the envelope flap (two wedges meeting in a V) */}
        <Cell col={0} row={1} fill={SOFT} />
        <Wedge col={1} row={1} corner="br" fill={INK} />
        <Wedge col={2} row={1} corner="bl" fill={INK} />
        <Cell col={3} row={1} fill={SOFT} />

        {/* Row 2 — body of the envelope, accent strip with cream insert */}
        <Cell col={0} row={2} fill={ACCENT} />
        <Half col={0} row={2} side="right" fill={BG} />
        <Cell col={1} row={2} fill={INK} />
        <Cell col={2} row={2} fill={ACCENT} />
        <Cell col={3} row={2} fill={INK} />

        {/* Row 3 — quiet rhythm */}
        <Cell col={0} row={3} fill={INK} />
        <Wedge col={1} row={3} corner="tr" fill={ACCENT} />
        <Cell col={2} row={3} fill={SOFT} />
        <Wedge col={3} row={3} corner="tl" fill={ACCENT} />

        {/* Row 4 — base line */}
        <Cell col={0} row={4} fill={ACCENT} />
        <Cell col={1} row={4} fill={INK} />
        <Cell col={2} row={4} fill={ACCENT} />
        <Cell col={3} row={4} fill={SOFT} />
      </Mural>
    </AuthSidePanel>
  );
}
