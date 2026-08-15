import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '@supabase/supabase-js';
import './UserMenu.css';

function getUserInitial(user: User | null): string {
  if (!user) return '?';

  const name =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim();

  if (name) return name.charAt(0).toUpperCase();

  const email = user.email?.trim();
  if (email) return email.charAt(0).toUpperCase();

  return '?';
}

interface UserMenuProps {
  user: User | null;
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const initial = getUserInitial(user);
  const email = user?.email ?? '';

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function updatePosition() {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;
    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    const preferredLeft = rect.right - menuWidth;
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - menuWidth - 8));
    setCoords({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    menuRef.current?.querySelector<HTMLButtonElement>('[data-user-menu-action]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }

    function handleViewport() {
      updatePosition();
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleViewport);
    window.addEventListener('scroll', handleViewport, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleViewport);
      window.removeEventListener('scroll', handleViewport, true);
    };
  }, [open]);

  return (
    <div className="user-menu">
      <button
        ref={buttonRef}
        type="button"
        className="user-menu__avatar liquid-glass"
        aria-label="Conta do usuário"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <span className="user-menu__initial" aria-hidden="true">
          {initial}
        </span>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          className="user-menu__panel liquid-glass"
          role="menu"
          aria-label="Conta do usuário"
          style={{ top: coords.top, left: coords.left }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <p className="user-menu__email" title={email}>
            {email}
          </p>
          <button
            type="button"
            role="menuitem"
            data-user-menu-action
            className="user-menu__sign-out"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              onSignOut();
            }}
          >
            Sair
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
