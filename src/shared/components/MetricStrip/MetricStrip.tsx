import type { ReactNode } from 'react';

export interface MetricItem {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'warning' | 'error' | 'success';
}

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="metric-strip">
      {items.map((item) => (
        <div className={`metric-strip__item metric-strip__item--${item.tone ?? 'default'}`} key={item.label}>
          <span className="metric-strip__label">{item.label}</span>
          <strong className="metric-strip__value">{item.value}</strong>
          {item.hint && <span className="metric-strip__hint">{item.hint}</span>}
        </div>
      ))}
    </div>
  );
}
