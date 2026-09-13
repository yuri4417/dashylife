import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'retry';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-lg disabled:opacity-50',
  secondary:
    'px-4 py-2 text-sm font-medium text-primary bg-surface border border-border rounded-lg hover:bg-surface-active transition-colors',
  ghost:
    'px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-lg',
  icon: 'text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active flex-shrink-0',
  retry:
    'px-4 py-2 text-sm font-medium text-primary bg-surface border border-border rounded-lg hover:bg-surface-active transition-colors',
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
      className={`flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg font-medium text-sm bg-action text-action-text hover:opacity-90 transition-opacity ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
