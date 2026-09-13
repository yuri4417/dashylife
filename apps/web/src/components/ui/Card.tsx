import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-border-subtle bg-surface p-4 sm:p-6 ${className}`}>
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
    <div className="group min-w-0 rounded-lg border border-border-subtle bg-surface p-4 transition-colors hover:border-border">
      <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {value}
      </p>
    </div>
  );
}
