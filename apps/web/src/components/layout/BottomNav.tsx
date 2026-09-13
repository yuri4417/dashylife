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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface md:hidden"
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
              className={`group relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-tertiary'
              }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-10 rounded-full transition-opacity ${
                  active ? 'bg-accent opacity-100' : 'opacity-0'
                }`}
              />
              <span className="transition-transform duration-200 group-hover:scale-110">
                <item.Icon size={22} strokeWidth={active ? 2.25 : 2} />
              </span>
              <span className="max-w-full truncate leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
