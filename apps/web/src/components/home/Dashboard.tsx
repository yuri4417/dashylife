import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Gamepad2, Sparkles } from 'lucide-react';
import type { AppSettings, Game, Todo } from '@dashylife/shared';
import { fetchGames, fetchTodos } from '../../utils/api';
import type { SectionType } from '../layout/BottomNav';

export function Dashboard({ settings, onNavigate }: { settings: AppSettings; onNavigate: (section: SectionType) => void }) {
  const [todos, setTodos] = useState<Todo[]>([]); const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(false); try { const [tasks, library] = await Promise.all([settings.todolist.enabled ? fetchTodos() : Promise.resolve([]), settings.gamelist.enabled ? fetchGames() : Promise.resolve([])]); setTodos(tasks); setGames(library); } catch { setError(true); } finally { setLoading(false); } }, [settings.todolist.enabled, settings.gamelist.enabled]);
  useEffect(() => { void load(); }, [load]);
  const pending = todos.filter(t => !t.completed); const playing = games.filter(g => g.status === 'jogando');
  return <div className="dashboard"><div className="page-heading"><div><span className="concept-eyebrow">UM ESPAÇO PARA VOCÊ</span><h1>Seu dia, do seu jeito.</h1><p>Tudo o que importa, em um só lugar.</p></div><span className="heading-note">✳ &nbsp; UM DIA DE CADA VEZ</span></div>
    <div className="dashboard-grid"><section className="dashboard-hero"><div><span className="concept-eyebrow">BEM-VINDO AO SEU ESPAÇO</span><h2>Uma coisa de cada vez.</h2><p>Organize seus planos, acompanhe suas conquistas e encontre tempo para o que você gosta.</p></div><div className="hero-art" aria-hidden="true"><span>✳</span></div></section>
    {loading ? <p className="dashboard-status">Carregando seu espaço...</p> : error ? <div className="dashboard-status" role="alert">Não foi possível carregar o resumo. <button onClick={() => void load()}>Tentar novamente</button></div> : <>
    {settings.todolist.enabled && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>Suas tarefas</h2><p>Um passo de cada vez</p></div><button onClick={() => onNavigate('todo')}>Ver todas ↗</button></div>{pending.length ? pending.slice(0,3).map(todo => <div className="dashboard-row" key={todo.id}><ClipboardList size={17}/><div><strong>{todo.title}</strong><small>{todo.dueDate ? new Date(`${todo.dueDate.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}</small></div></div>) : <p className="dashboard-empty">Nenhuma tarefa pendente.</p>}</section>}
    {settings.gamelist.enabled && <section className="dashboard-panel"><div className="dashboard-panel-head"><div><h2>Em jogo</h2><p>Suas próximas aventuras</p></div><button onClick={() => onNavigate('gamelist')}>Ver biblioteca ↗</button></div>{playing.length ? playing.slice(0,3).map(game => <div className="dashboard-row" key={game.id}><span className="game-initial">{game.title.slice(0,2).toUpperCase()}</span><div><strong>{game.title}</strong><small>{game.platform}</small></div><span className="dashboard-badge">Jogando</span></div>) : <p className="dashboard-empty">Nenhum jogo em andamento.</p>}</section>}
    <div className="dashboard-overview">{settings.todolist.enabled && <div><ClipboardList/><strong>{pending.length}</strong><span>Tarefas pendentes</span></div>}{settings.gamelist.enabled && <div><Gamepad2/><strong>{games.length}</strong><span>Jogos na biblioteca</span></div>}<div><Sparkles/><strong>{Number(settings.todolist.enabled) + Number(settings.gamelist.enabled)}</strong><span>Serviços ativos</span></div></div></>}
    </div></div>;
}
