type Props = {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
};

export default function DateRangeFields({ from, to, onChange }: Props) {
  return (
    <div className="date-range">
      <label className="date-range__field">
        <span className="date-range__label">From</span>
        <input
          type="date"
          value={from}
          onChange={e => onChange({ from: e.target.value, to })}
          className="date-range__input"
        />
      </label>
      <label className="date-range__field">
        <span className="date-range__label">To</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={e => onChange({ from, to: e.target.value })}
          className="date-range__input"
        />
      </label>
    </div>
  );
}
