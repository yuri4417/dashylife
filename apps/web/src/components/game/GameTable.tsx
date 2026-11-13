import { ArrowDownUp, Edit3, Trash2 } from 'lucide-react';
import type { Game } from '@dashylife/shared';
import { formatDate } from '../../utils/dateUtils';
import { SelectInput } from '../ui/FormField';
import { StatusBadge } from './StatusBadge';
import { TagList } from './TagList';
interface GameTableProps { games: Game[]; sortKey: keyof Game; sortDirection: 'asc' | 'desc'; onSort: (key: keyof Game) => void; onEdit: (game: Game) => void; onDelete: (id: string) => void; }
const COLUMNS = [{key:'title',label:'Título'},{key:'platform',label:'Plataforma'},{key:'status',label:'Status'},{key:'date',label:'Data'},{key:'description',label:'Descrição'},{key:'tags',label:'Tags'}] as const;
export function GameTable({games,sortKey,sortDirection,onSort,onEdit,onDelete}: GameTableProps) {
 return <><div className="game-sort"><span>Ordenar por</span><SelectInput label="Ordenar jogos por" value={sortKey} onValueChange={value => onSort(value as keyof Game)}>{COLUMNS.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}</SelectInput><button type="button" className="sort-direction" onClick={() => onSort(sortKey)} aria-label={`Alterar ordem: ${sortDirection === 'asc' ? 'crescente' : 'decrescente'}`}><ArrowDownUp size={16}/>{sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}</button></div><div className="game-list">{games.map(game => <article className="game-list-row" key={game.id}><div className="game-initial" aria-hidden="true">{game.title.slice(0,2).toUpperCase()}</div><div className="game-list-details"><strong>{game.title}</strong><p>{game.platform}{game.date ? ` · ${formatDate(game.date)}` : ''}</p>{game.description && <p>{game.description}</p>}{game.tags.length > 0 && <TagList gameId={game.id} tags={game.tags}/>}</div><StatusBadge status={game.status}/><div className="game-actions"><button type="button" onClick={() => onEdit(game)} aria-label="Editar jogo"><Edit3 size={16}/></button><button type="button" onClick={() => onDelete(game.id)} aria-label="Excluir jogo"><Trash2 size={16}/></button></div></article>)}</div></>;
}
