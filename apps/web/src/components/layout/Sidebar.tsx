import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { MenuItem } from './BottomNav';

interface SidebarProps {
  appearance: 'warm' | 'minimal'; menuItems: MenuItem[]; activeSection: string; collapsed: boolean;
  onToggle: () => void; onSelect: (id: MenuItem['id']) => void;
}
export function Sidebar({ appearance, menuItems, activeSection, collapsed, onToggle, onSelect }: SidebarProps) {
  const links = menuItems.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => onSelect(id)} aria-current={activeSection === id ? 'page' : undefined} title={collapsed && appearance === 'warm' ? label : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span>{activeSection === id && <span className="nav-chevron" aria-hidden="true">›</span>}</button>);
  if (appearance === 'minimal') return <header className="concept-minimal-nav"><div className="concept-brand"><span className="concept-mark">d<small>✳</small></span><strong>dashylife</strong></div><nav aria-label="Navegação principal">{links}</nav></header>;
  return <aside className={`concept-sidebar ${collapsed ? 'is-collapsed' : ''}`}><div className="concept-brand"><span className="concept-mark">d<small>✳</small></span><div><strong>dashylife</strong><small>seu espaço, seu ritmo</small></div><button type="button" className="collapse-button" onClick={onToggle} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button></div><p className="sidebar-label">SEU ESPAÇO</p><nav aria-label="Navegação principal">{links}</nav><div className="sidebar-note"><Sparkles size={20}/><strong>Um dia de cada vez.</strong><p>Um pouco de organização deixa espaço para o que importa.</p></div></aside>;
}
