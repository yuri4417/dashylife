import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  icon?: ReactNode;
}

export function Modal({ title, onClose, children, footer, maxWidth = 'max-w-md', icon }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className={`w-full ${maxWidth} max-h-[90dvh] overflow-y-auto rounded-xl border border-border-subtle bg-surface`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 sm:pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <h3 className="font-display text-lg font-semibold tracking-tight text-primary">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-primary"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-5 space-y-5">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
