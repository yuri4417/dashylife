import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MenuItem } from './BottomNav';

interface SidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: MenuItem['id']) => void;
}

export function Sidebar({ menuItems, activeSection, collapsed, onToggle, onSelect }: SidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 bg-surface border-r border-border-subtle transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <h1 className="font-display text-lg font-semibold tracking-tight text-primary">DashyLife</h1>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-surface-active text-tertiary hover:text-primary transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === item.id
                ? 'bg-surface-active text-primary'
                : 'text-tertiary hover:text-primary hover:bg-surface-active'
            }`}
            title={collapsed ? item.label : ''}
          >
            <span className="flex-shrink-0 flex items-center justify-center">
              <item.Icon size={18} />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {activeSection === item.id && !collapsed && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
