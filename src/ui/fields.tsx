import { useEffect, useState } from 'react';

/** Text input that commits on blur/Enter so typing does not create an undo step per keystroke. */
export function TextField({ value, onCommit, placeholder, multiline, id, list }: { value: string; onCommit: (v: string) => void; placeholder?: string; multiline?: boolean; id?: string; list?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v !== value) onCommit(v);
  };
  if (multiline)
    return <textarea id={id} value={v} placeholder={placeholder} rows={3} onChange={(e) => setV(e.target.value)} onBlur={commit} />;
  return (
    <input
      id={id}
      list={list}
      type="text"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setV(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function NumberField({ value, onCommit, min, max, step, unit }: { value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    let n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n)) n = value;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setV(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <span className="numfield">
      <input
        type="number"
        value={v}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
