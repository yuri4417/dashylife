import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'retry';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-action px-5 py-2.5 text-sm font-medium text-action-text transition-colors hover:bg-zinc-200 disabled:opacity-50',
  secondary:
    'border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border hover:bg-surface-active',
  ghost: 'px-5 py-2.5 text-sm font-medium text-tertiary transition-colors hover:text-primary',
  icon: 'flex h-8 w-8 flex-shrink-0 items-center justify-center text-tertiary transition-colors hover:bg-surface-active hover:text-danger',
  retry:
    'border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-active',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidthOnMobile?: boolean;
}

export function ActionButton({ children, fullWidthOnMobile = true, className = '', ...rest }: ActionButtonProps) {
  return (
    <button
      className={`flex items-center justify-center gap-2 bg-action px-5 py-2.5 text-sm font-medium text-action-text transition-colors hover:bg-zinc-200 ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
