/**
 * Shown when a space-scoped query was refused. Without it a 403 renders
 * as an empty page, which reads as "you have nothing" rather than "we
 * could not read it" — the failure mode that sent us looking in the
 * wrong place.
 */
export default function DataNotice({ what }: { what: string }) {
  return (
    <div className="data-notice">
      <p className="data-notice__text">
        This family space wouldn’t return {what}. The account may not currently
        be permitted to read it, or the membership needs repairing on the server.
      </p>
      <p className="data-notice__sub">
        Nothing you have written is affected — this is a read problem, not a data one.
      </p>
    </div>
  );
}
