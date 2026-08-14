import './AppLogo.css';

type AppLogoSize = 'xs' | 'sm' | 'md' | 'lg';

type AppLogoProps = {
  size?: AppLogoSize;
  className?: string;
};

export function AppLogo({ size = 'sm', className }: AppLogoProps) {
  const classes = ['app-logo', `app-logo--${size}`, className].filter(Boolean).join(' ');

  return (
    <img
      src="/logo.jpg"
      alt="iMoney"
      className={classes}
      width={size === 'xs' ? 28 : size === 'sm' ? 40 : size === 'md' ? 56 : 80}
      height={size === 'xs' ? 28 : size === 'sm' ? 40 : size === 'md' ? 56 : 80}
      decoding="async"
    />
  );
}
