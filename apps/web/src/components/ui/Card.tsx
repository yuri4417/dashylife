import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface border border-border-subtle rounded-2xl p-4 sm:p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="p-4 sm:p-5 bg-surface-active border border-border-subtle rounded-xl min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold text-tertiary uppercase tracking-wider mb-1 sm:mb-2 truncate">
        {label}
      </p>
      <p className="font-display text-2xl sm:text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
