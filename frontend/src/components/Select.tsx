import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

function nextEnabledIndex(options: SelectOption[], from: number, step: number) {
  if (options.length === 0) return -1;
  let index = from;
  for (let i = 0; i < options.length; i += 1) {
    index = (index + step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  required = false,
  disabled = false,
  name,
}: SelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef('');
  const searchTimerRef = useRef<number>(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });

  const selected = options.find((option) => option.value === value);
  const activeOption = options[activeIndex];

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectValue(nextValue: string) {
    onChange(nextValue);
    close();
  }

  function updatePosition() {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(280, openUp ? spaceAbove : spaceBelow));
    const top = openUp ? rect.top - Math.min(menu.offsetHeight, maxHeight) - 4 : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setCoords({ top, left, width, maxHeight });
  }

  function findByQuery(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return -1;
    return options.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(normalized),
    );
  }

  function handleTypeahead(character: string) {
    window.clearTimeout(searchTimerRef.current);
    searchRef.current += character.toLowerCase();
    const match = findByQuery(searchRef.current);
    if (match >= 0) setActiveIndex(match);
    searchTimerRef.current = window.setTimeout(() => {
      searchRef.current = '';
    }, 500);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabledIndex(options, -1, 1));
    updatePosition();
    // Só reposiciona e destaca a opção atual ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const active = menuRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleViewport() {
      updatePosition();
    }

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('resize', handleViewport);
    window.addEventListener('scroll', handleViewport, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('resize', handleViewport);
      window.removeEventListener('scroll', handleViewport, true);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(searchTimerRef.current), []);

  function handleTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === ' ')) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setOpen(true);
      handleTypeahead(event.key);
      return;
    }

    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => nextEnabledIndex(options, current, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => nextEnabledIndex(options, current, -1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(nextEnabledIndex(options, -1, 1));
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(nextEnabledIndex(options, options.length, -1));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (activeOption && !activeOption.disabled) selectValue(activeOption.value);
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      handleTypeahead(event.key);
    }
  }

  return (
    <div className="app-select">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`app-select__trigger${open ? ' app-select__trigger--open' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-required={required || undefined}
        aria-activedescendant={open && activeOption ? `${listId}-opt-${activeIndex}` : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKey}
      >
        <span className={selected ? 'app-select__value' : 'app-select__value app-select__value--placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className="app-select__chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={listId}
          className="app-select__menu liquid-glass"
          role="listbox"
          aria-labelledby={id}
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
          }}
        >
          {options.length === 0 ? (
            <div className="app-select__empty">Nenhuma opção disponível</div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.value || `empty-${index}`}
                id={`${listId}-opt-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                disabled={option.disabled}
                aria-selected={option.value === value}
                data-active={index === activeIndex}
                className={
                  `app-select__option${option.value === value ? ' app-select__option--selected' : ''}`
                  + `${index === activeIndex ? ' app-select__option--active' : ''}`
                }
                onMouseEnter={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
                onClick={() => {
                  if (!option.disabled) selectValue(option.value);
                }}
              >
                <span className="app-select__option-label">{option.label}</span>
                {option.hint && <small className="app-select__option-hint">{option.hint}</small>}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
