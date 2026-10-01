/**
 * Temporary scaffolding for routes the new navigation points at but
 * whose screens have not been built yet. Every one of these is replaced
 * by a real screen as its phase lands — when the last is gone, delete
 * this component and the `.stub-page` rules in globals.css.
 */
export default function ScreenStub({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="stub-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="stub-page__title">{title}</h1>
      <p className="stub-page__blurb">{blurb}</p>
      <p className="stub-page__note">
        Not built yet. The navigation is in place so the information
        architecture can be reviewed before the screens land.
      </p>
    </div>
  );
}
