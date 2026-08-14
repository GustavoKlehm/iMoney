import './LiquidProgress.css';

type LiquidProgressVariant = 'default' | 'success' | 'warning' | 'danger';
type LiquidProgressSize = 'default' | 'thin';

type LiquidProgressProps = {
  value: number;
  max?: number;
  variant?: LiquidProgressVariant;
  size?: LiquidProgressSize;
  label?: string;
};

function variantClass(variant: LiquidProgressVariant, percent: number): string {
  if (variant !== 'default') return `liquid-fill--${variant}`;
  if (percent >= 100) return 'liquid-fill--danger';
  if (percent >= 90) return 'liquid-fill--danger';
  if (percent >= 75) return 'liquid-fill--warning';
  return 'liquid-fill--default';
}

export function LiquidProgress({
  value,
  max = 100,
  variant = 'default',
  size = 'default',
  label,
}: LiquidProgressProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);
  const fillClass = variantClass(variant, percent);
  const trackClass = size === 'thin' ? 'liquid-track liquid-track--thin' : 'liquid-track';

  return (
    <div
      className={trackClass}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`liquid-fill ${fillClass}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
