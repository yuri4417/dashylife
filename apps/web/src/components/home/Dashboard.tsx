import { ClipboardList, Gamepad2, Sparkles } from 'lucide-react';
import type { AppSettings, Game, Todo } from '@dashylife/shared';
import type { Collection } from '../../hooks/useCollection';
import type { SectionType } from '../layout/BottomNav';

interface DashboardProps {
  settings: AppSettings | null;
  settingsError: string | null;
  loadSettings: () => Promise<void>;
  todos: Collection<Todo>;
  games: Collection<Game>;
  onNavigate: (section: SectionType) => void;
}

export function Dashboard({ settings, settingsError, loadSettings, todos, games, onNavigate }: DashboardProps) {
  const loading = (settings?.todolist.enabled && todos.loading) || (settings?.gamelist.enabled && games.loading);
  const error = settingsError || (settings?.todolist.enabled && todos.error) || (settings?.gamelist.enabled && games.error);
  const retry = () => {
    if (!settings) void loadSettings();
    if (settings?.todolist.enabled && todos.error) void todos.load();
    if (settings?.gamelist.enabled && games.error) void games.load();
  };
  const pending = todos.items.filter((todo) => !todo.completed);
  const playing = games.items.filter((game) => game.status === 'jogando');
  return <div className="dashboard"><div className="page-heading"><div><span className="concept-eyebrow">UM ESPAÇO PARA VOCÊ</span><h1>Seu dia, do seu jeito.</h1><p>Tudo o que importa, em um só lugar.</p></div><span className="heading-note">✳ &nbsp; UM DIA DE CADA VEZ</span></div>
    <div className="dashboard-grid"><section className="dashboard-hero"><div><span className="concept-eyebrow">BEM-VINDO AO SEU ESPAÇO</span><h2>Uma coisa de cada vez.</h2><p>Organize seus planos, acompanhe suas conquistas e encontre tempo para o que você gosta.</p></div><div className="hero-art" aria-hidden="true"><span>✳</span></div></section>
    {error ? <div className="dashboard-status" role="alert">{error} <button onClick={retry}>Tentar novamente</button></div> : null}
    {!settings || loading ? !error && <p className="dashboard-status">Carregando seu espaço...</p> : <>
    {settings.todolist.enabled && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>Suas tarefas</h2><p>Um passo de cada vez</p></div><button onClick={() => onNavigate('todo')}>Ver todas ↗</button></div>{pending.length ? pending.slice(0,3).map(todo => <div className="dashboard-row" key={todo.id}><ClipboardList size={17}/><div><strong>{todo.title}</strong><small>{todo.dueDate ? new Date(`${todo.dueDate.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}</small></div></div>) : <p className="dashboard-empty">Nenhuma tarefa pendente.</p>}</section>}
    {settings.gamelist.enabled && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>Em jogo</h2><p>Suas próximas aventuras</p></div><button onClick={() => onNavigate('gamelist')}>Ver biblioteca ↗</button></div>{playing.length ? playing.slice(0,3).map(game => <div className="dashboard-row" key={game.id}><span className="game-initial">{game.title.slice(0,2).toUpperCase()}</span><div><strong>{game.title}</strong><small>{game.platform}</small></div><span className="dashboard-badge">Jogando</span></div>) : <p className="dashboard-empty">Nenhum jogo em andamento.</p>}</section>}
    <div className="dashboard-overview">{settings.todolist.enabled && <div><ClipboardList/><strong>{pending.length}</strong><span>Tarefas pendentes</span></div>}{settings.gamelist.enabled && <div><Gamepad2/><strong>{games.items.length}</strong><span>Jogos na biblioteca</span></div>}<div><Sparkles/><strong>{Number(settings.todolist.enabled) + Number(settings.gamelist.enabled)}</strong><span>Serviços ativos</span></div></div></>}
    </div></div>;
}
