import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MenuItem } from './BottomNav';

interface SidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: MenuItem['id']) => void;
}

function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 text-accent"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function Sidebar({ menuItems, activeSection, collapsed, onToggle, onSelect }: SidebarProps) {
  return (
    <aside className={`hidden md:flex flex-shrink-0 p-4 ${collapsed ? 'w-20' : 'w-60 lg:w-72'}`}>
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <div
          className={`flex h-14 flex-shrink-0 items-center border-b border-border-subtle ${
            collapsed ? 'justify-center' : 'justify-between px-3'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <h1 className="font-display text-base font-semibold tracking-tight text-primary">DashyLife</h1>
            </div>
          )}
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-primary"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {menuItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${active ? 'bg-surface-active text-primary' : 'text-tertiary hover:bg-surface-active hover:text-primary'}`}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                )}
                <span className="flex flex-shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <item.Icon size={18} />
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
