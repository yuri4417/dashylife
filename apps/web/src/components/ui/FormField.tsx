import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

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

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export function SelectInput({ children, className = '', ...rest }: SelectInputProps) {
  return (
    <select className={`${BASE_INPUT} border-border ${className}`} {...rest}>
      {children}
    </select>
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
