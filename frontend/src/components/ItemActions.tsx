import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import type { ItemAction } from '../utils/confirmRemoval';
import './ItemActions.css';

export type ItemActionsHandle = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

interface ItemActionsProps {
  name: string;
  actions: ItemAction[];
  /** Hide the ⋮ button (e.g. mobile: open via row click). */
  hideTrigger?: boolean;
  /** Element used to position the menu when the trigger is hidden. */
  anchorRef?: RefObject<HTMLElement | null>;
}

export const ItemActions = forwardRef<ItemActionsHandle, ItemActionsProps>(
  function ItemActions({ name, actions, hideTrigger = false, anchorRef }, ref) {
    const menuId = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    function focusHost() {
      if (!hideTrigger) {
        buttonRef.current?.focus();
        return;
      }
      anchorRef?.current?.focus();
    }

    function close() {
      setOpen(false);
      focusHost();
    }

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close,
      toggle: () => setOpen((current) => !current),
    }));

    function updatePosition() {
      const anchor = hideTrigger ? anchorRef?.current : buttonRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const rect = anchor.getBoundingClientRect();
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
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    }, [open, hideTrigger]);

    useEffect(() => {
      if (!open) return;

      function handlePointer(event: MouseEvent) {
        const target = event.target as Node;
        if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
        if (hideTrigger && anchorRef?.current?.contains(target)) return;
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
    }, [open, hideTrigger, anchorRef]);

    const visibleActions = actions.filter(Boolean);

    return (
      <>
        {!hideTrigger && (
          <button
            ref={buttonRef}
            type="button"
            className="item-actions__trigger"
            aria-label={`Ações de ${name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <circle cx="9" cy="4" r="1.5" fill="currentColor" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            </svg>
          </button>
        )}
        {open && createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="item-actions__menu liquid-glass"
            role="menu"
            aria-label={`Ações de ${name}`}
            style={{ top: coords.top, left: coords.left }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {visibleActions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className={action.danger ? 'item-actions__item item-actions__item--danger' : 'item-actions__item'}
                disabled={action.disabled}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  action.onSelect();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </>
    );
  },
);
