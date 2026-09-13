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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-surface border border-border-subtle rounded-2xl w-full ${maxWidth} shadow-2xl max-h-[90dvh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              {icon}
              <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-5">{children}</div>
          {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
