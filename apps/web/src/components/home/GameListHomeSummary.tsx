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
  backgroundColor: '#141416',
  borderColor: '#262629',
  color: '#F5F5F6',
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
        <p className="text-tertiary text-sm">Carregando...</p>
      </Card>
    );
  }

  return (
    <Card>
      <SummaryTitle />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total" value={games.length} />
        <StatCard label="Jogando" value={playingGames.length} />
        <StatCard label="Não Jogado" value={naoJogado} />
        <StatCard label="Zerado" value={zerados} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartBlock title="Por Status" data={statusData} cellPrefix="cell-status" />
        <ChartBlock title="Por Plataforma" data={platformData} cellPrefix="cell-platform" />
        <div className="lg:col-span-1 sm:col-span-2">
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">
            Jogando agora
          </h4>
          {playingGames.length === 0 ? (
            <p className="text-sm text-tertiary text-center py-8">Nenhum jogo em andamento</p>
          ) : (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {playingGames.slice(0, 6).map((game) => (
                <li
                  key={game.id}
                  className="flex items-center gap-3 p-3 bg-surface-active border border-border-subtle rounded-xl transition-colors hover:border-border"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-primary truncate flex-1 min-w-0">{game.title}</span>
                  <span className="text-xs text-tertiary whitespace-nowrap px-2 py-0.5 bg-border/60 rounded-pill">
                    {game.platform}
                  </span>
                </li>
              ))}
              {playingGames.length > 6 && (
                <li className="text-xs text-tertiary text-center py-2">
                  +{playingGames.length - 6} mais...
                </li>
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
    <div className="flex items-center gap-3 mb-6">
      <Gamepad2 size={20} className="text-accent" />
      <h3 className="font-display text-lg font-semibold text-primary">GameList - Resumo</h3>
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
      <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3 text-center">
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
            itemStyle={{ color: '#A3A3A3' }}
            wrapperStyle={{ zIndex: 100 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
