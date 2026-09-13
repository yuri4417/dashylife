import type { LucideIcon } from 'lucide-react';

export type SectionType = 'home' | 'todo' | 'gamelist' | 'settings';

export interface MenuItem {
  id: SectionType;
  label: string;
  Icon: LucideIcon;
}

interface BottomNavProps {
  menuItems: MenuItem[];
  activeSection: SectionType;
  onSelect: (id: SectionType) => void;
}

export function BottomNav({ menuItems, activeSection, onSelect }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}>
        {menuItems.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 px-1 pt-2.5 pb-2 min-h-[60px] text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-tertiary'
              }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-10 rounded-full transition-opacity ${
                  active ? 'bg-accent opacity-100' : 'opacity-0'
                }`}
              />
              <item.Icon size={22} strokeWidth={active ? 2.25 : 2} />
              <span className="truncate max-w-full leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
