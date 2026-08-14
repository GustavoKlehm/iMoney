import './AppLogo.css';

type AppLogoSize = 'xs' | 'sm' | 'md' | 'lg';

const LOGO_SIZE: Record<AppLogoSize, number> = {
  xs: 28,
  sm: 40,
  md: 56,
  lg: 80,
};

type AppLogoProps = {
  size?: AppLogoSize;
  className?: string;
};

export function AppLogo({ size = 'sm', className }: AppLogoProps) {
  const dim = LOGO_SIZE[size];
  const wrapClass = ['app-logo-wrap', `app-logo-wrap--${size}`, className].filter(Boolean).join(' ');

  return (
    <div className={wrapClass}>
      <img
        src="/logo.png"
        alt="iMoney"
        className="app-logo__img"
        width={dim}
        height={dim}
        decoding="async"
      />
    </div>
  );
}
