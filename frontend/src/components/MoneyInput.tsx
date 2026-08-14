import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type InputHTMLAttributes,
} from 'react';
import {
  appendMoneyDigit,
  centsToReais,
  digitsToCents,
  formatMoneyInput,
  reaisToCents,
  removeMoneyDigit,
} from '../utils/format';

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: number;
  onChange: (value: number) => void;
};

export function MoneyInput({ value, onChange, onKeyDown, onPaste, ...props }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cents = reaisToCents(value);
  const display = formatMoneyInput(cents);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, [display]);

  function setCents(nextCents: number) {
    onChange(centsToReais(nextCents));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      setCents(appendMoneyDigit(cents, Number(event.key)));
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setCents(removeMoneyDigit(cents));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    setCents(digitsToCents(event.clipboardData.getData('text')));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setCents(digitsToCents(event.target.value));
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="done"
      spellCheck={false}
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
}
