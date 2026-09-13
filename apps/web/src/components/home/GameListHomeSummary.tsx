import { useEffect, useMemo, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import type { Game } from '@dashylife/shared';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { fetchGames } from '../../utils/api';
import { Card, StatCard } from '../ui/Card';

const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#F97318', '#EC4899'];

const STATUS_LABELS: Record<string, string> = {
  'nao-jogado': 'Não Jogado',
  jogando: 'Jogando',
  zerado: 'Zerado',
  droppado: 'Droppado',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#131316',
  borderColor: '#27272a',
  color: '#fafafa',
  borderRadius: '8px',
};

export function GameListHomeSummary() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  const statusData = useMemo(
    () =>
      Object.entries(STATUS_LABELS).map(([value, name]) => ({
        name,
        value: games.filter((g) => g.status === value).length,
      })),
    [games],
  );

  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const game of games) counts[game.platform] = (counts[game.platform] || 0) + 1;
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [games]);

  // Derivado durante a renderização (sem useEffect/useMemo desnecessário para filtros simples)
  const playingGames = games.filter((g) => g.status === 'jogando');
  const naoJogado = games.filter((g) => g.status === 'nao-jogado').length;
  const zerados = games.filter((g) => g.status === 'zerado').length;

  if (loading) {
    return (
      <Card>
        <SummaryTitle />
        <p className="text-sm text-tertiary">Carregando...</p>
      </Card>
    );
  }

  return (
    <Card>
      <SummaryTitle />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={games.length} />
        <StatCard label="Jogando" value={playingGames.length} />
        <StatCard label="Não Jogado" value={naoJogado} />
        <StatCard label="Zerado" value={zerados} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ChartBlock title="Por Status" data={statusData} cellPrefix="cell-status" />
        <ChartBlock title="Por Plataforma" data={platformData} cellPrefix="cell-platform" />
        <div className="sm:col-span-2 lg:col-span-1">
          <h4 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Jogando agora
          </h4>
          {playingGames.length === 0 ? (
            <p className="py-8 text-center text-sm text-tertiary">Nenhum jogo em andamento</p>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {playingGames.slice(0, 6).map((game) => (
                <li
                  key={game.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 transition-colors hover:border-border"
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-primary">{game.title}</span>
                  <span className="flex-shrink-0 rounded-pill bg-surface-active px-2 py-0.5 text-xs text-tertiary">
                    {game.platform}
                  </span>
                </li>
              ))}
              {playingGames.length > 6 && (
                <li className="py-2 text-center text-xs text-tertiary">+{playingGames.length - 6} mais...</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function SummaryTitle() {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
        <Gamepad2 size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold tracking-tight text-primary">GameList</h3>
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">
          Resumo do módulo
        </p>
      </div>
    </div>
  );
}

function ChartBlock({
  title,
  data,
  cellPrefix,
}: {
  title: string;
  data: { name: string; value: number }[];
  cellPrefix: string;
}) {
  return (
    <div className="lg:col-span-1">
      <h4 className="mb-3 text-center text-[10px] font-medium uppercase tracking-widest text-tertiary">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} innerRadius={50} outerRadius={65} dataKey="value" paddingAngle={4} stroke="none">
            {data.map((_, index) => (
              <Cell key={`${cellPrefix}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: '#a1a1aa' }}
            wrapperStyle={{ zIndex: 100 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
