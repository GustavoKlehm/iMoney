import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './GlassNav.css';

export type GlassNavItem = {
  to: string;
  label: string;
  end?: boolean;
  matchPrefix?: string[];
};

type ThumbRect = {
  left: number;
  width: number;
};

type GlassNavProps = {
  items: GlassNavItem[];
  'aria-label'?: string;
};

export function GlassNav({ items, 'aria-label': ariaLabel }: GlassNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const [thumb, setThumb] = useState<ThumbRect>({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const updateThumb = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const active = nav.querySelector<HTMLElement>('.nav-link.active');
    if (!active) return;

    setThumb({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    updateThumb();
  }, [location.pathname, updateThumb]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateThumb);
    observer.observe(nav);
    window.addEventListener('resize', updateThumb);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateThumb);
    };
  }, [updateThumb]);

  return (
    <nav ref={navRef} className="glass-nav" aria-label={ariaLabel}>
      <div
        className={`glass-nav-thumb${ready ? ' glass-nav-thumb--ready' : ''}`}
        aria-hidden="true"
        style={{
          width: thumb.width,
          transform: `translateX(${thumb.left}px)`,
        }}
      />
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => {
            const matches = item.matchPrefix
              ? item.matchPrefix.some(
                  (prefix) =>
                    location.pathname === prefix ||
                    location.pathname.startsWith(`${prefix}/`),
                )
              : isActive;
            return matches ? 'nav-link active' : 'nav-link';
          }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
