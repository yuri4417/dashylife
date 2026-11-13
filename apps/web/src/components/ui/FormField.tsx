import { Children, isValidElement, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

const BASE_INPUT =
  'w-full rounded-lg border bg-surface px-4 py-3 text-sm text-primary placeholder:text-tertiary transition-colors focus:border-accent focus:outline-none';

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-tertiary">{label}</label>
      {children}
    </div>
  );
}

export function FieldError({ message }: { message: string }) {
  return <p className="mt-1.5 text-xs text-danger">{message}</p>;
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function TextInput({ hasError = false, className = '', ...rest }: TextInputProps) {
  return (
    <input
      className={`${BASE_INPUT} ${hasError ? 'border-danger' : 'border-border'} ${className}`}
      {...rest}
    />
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function TextArea({ hasError = false, className = '', ...rest }: TextAreaProps) {
  return (
    <textarea
      className={`${BASE_INPUT} resize-none ${hasError ? 'border-danger' : 'border-border'} ${className}`}
      {...rest}
    />
  );
}

interface SelectInputProps {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  label: string;
}

export function SelectInput({ children, value, onValueChange, label }: SelectInputProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const options = Children.toArray(children).filter(isValidElement<{ value: string; children: ReactNode; disabled?: boolean }>).map((child) => ({ value: child.props.value, label: child.props.children, disabled: child.props.disabled }));
  const selected = options.findIndex((option) => option.value === value);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const move = (direction: number) => {
    if (!options.length) return;
    let index = active;
    for (let count = 0; count < options.length; count++) { index = (index + direction + options.length) % options.length; if (!options[index].disabled) break; }
    setActive(index);
  };
  const choose = (index: number) => { if (!options[index] || options[index].disabled) return; onValueChange(options[index].value); setOpen(false); trigger.current?.focus(); };
  return (
    <div ref={root} className="custom-select">
      <button ref={trigger} type="button" className="select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? `${listId}-${active}` : undefined} onClick={() => { setActive(Math.max(0, selected)); setOpen(!open); }} onKeyDown={(event) => {
        if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { setActive(Math.max(0, selected)); setOpen(true); } else move(event.key === 'ArrowDown' ? 1 : -1); }
        else if (open && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(active); }
        else if (open && event.key === 'Tab') setOpen(false);
      }}>
        <span>{options[selected]?.label ?? 'Selecione'}</span><ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div id={listId} role="listbox" aria-label={label} className="select-options">
        {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={index === selected} aria-disabled={option.disabled || undefined} className={index === active ? 'active' : ''} onMouseMove={() => setActive(index)} onClick={() => choose(index)}>{option.label}</div>)}
      </div>}
    </div>
  );
}

interface CharCounterProps {
  current: number;
  max: number;
  warnAt?: number;
}

export function CharCounter({ current, max, warnAt = 450 }: CharCounterProps) {
  return (
    <div className="mt-1.5 text-right">
      <span className={`text-xs font-medium ${current > warnAt ? 'text-danger' : 'text-tertiary'}`}>
        {current}/{max}
      </span>
    </div>
  );
}
