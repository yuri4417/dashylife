import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import type { Todo } from '@dashylife/shared';
import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput, TextArea } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { DateInput } from '../ui/DateInput';
import { TimeInput } from '../ui/TimeInput';
import { RepeatInput } from '../ui/RepeatInput';
import { WeekdayPicker } from '../ui/WeekdayPicker';
import { TodoModal } from '../todo/TodoModal';
import { useTodos } from '../../hooks/useTodos';
import type { Collection } from '../../hooks/useCollection';
import { CalendarView, type CalendarActivity } from './CalendarView';
import { dateString, visibleRange, type CalendarView as View } from '../../utils/calendarDates';

type Category = { id: string; name: string; color: string };
type Recurrence = { frequency: 'daily' | 'weekly' | 'monthly'; interval: number; weekdays?: number[]; endDate?: string };
type Activity = CalendarActivity;
type Form = { title: string; description: string; categoryId: string; startDate: string; startTime: string; endTime: string; frequency: '' | Recurrence['frequency']; interval: string; weekdays: number[]; endDate: string };
const blank = (date: string): Form => ({ title: '', description: '', categoryId: '', startDate: date, startTime: '', endTime: '', frequency: '', interval: '1', weekdays: [], endDate: '' });
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';
  const response = await fetch(`${apiUrl}/routine${path}`, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || 'Não foi possível concluir a operação.'); }
  return response.status === 204 ? undefined as T : response.json();
}

export function Routine({ collection }: { collection: Collection<Todo> }) {
  const { items: todos, error: todosError, refresh: refreshTodos } = collection;
  const taskActions = useTodos(collection);
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>('week');
  const [deletingTask, setDeletingTask] = useState<Todo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [editChoice, setEditChoice] = useState<Activity | null>(null);
  const [editScope, setEditScope] = useState<'series' | 'occurrence'>('series');
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [managing, setManaging] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8bbf85');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);
  const [gridStart, gridEnd] = visibleRange(date, view);
  const start = dateString(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() - 1)), end = dateString(gridEnd);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try { setError(''); const [a, c] = await Promise.all([request<Activity[]>(`/activities?start=${start}&end=${end}`), request<Category[]>('/categories')]); if (version === loadVersion.current) { setActivities(a); setCategories(c); } }
    catch (e) { if (version === loadVersion.current) setError(e instanceof Error ? e.message : 'Não foi possível carregar a rotina.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [start, end]);
  useEffect(() => { void load(); refreshTodos(); }, [load, refreshTodos]);
  const update = (key: keyof Form, value: string) => setForm(current => current && ({ ...current, [key]: value }));
  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.startDate) { setError('Informe o título e a data da atividade.'); return; }
    if (!!form.startTime !== !!form.endTime || (form.startTime && form.endTime === form.startTime)) { setError('Informe horários de início e fim válidos e diferentes.'); return; }
    try {
      if (editing && editScope === 'occurrence') {
        const changes: Record<string, unknown> = {};
        if (form.title.trim() !== editing.title) changes.title = form.title.trim();
        if (form.description !== (editing.description || '')) changes.description = form.description || null;
        if (form.categoryId !== (editing.categoryId || '')) changes.categoryId = form.categoryId || null;
        if (form.startDate !== editing.occurrenceDate) changes.occurrenceDate = form.startDate;
        if (form.startTime !== (editing.startTime || '') || form.endTime !== (editing.endTime || '')) { changes.startTime = form.startTime || null; changes.endTime = form.endTime || null; }
        await request(`/activities/${editing.id}/occurrences/${editing.originalDate}`, 'PUT', changes);
      } else await request(`/activities${editing ? `/${editing.id}` : ''}`, editing ? 'PUT' : 'POST', { title: form.title.trim(), description: form.description || null, categoryId: form.categoryId || null, startDate: form.startDate, startTime: form.startTime || null, endTime: form.endTime || null, recurrence: form.frequency ? { frequency: form.frequency, interval: Math.max(1, Number(form.interval) || 1), ...(form.frequency === 'weekly' && form.weekdays.length ? { weekdays: form.weekdays } : {}), ...(form.endDate ? { endDate: form.endDate } : {}) } : null });
      setForm(null); setEditing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a atividade.'); }
  };
  const edit = (activity: Activity, scope: 'series' | 'occurrence') => { setEditScope(scope); setEditChoice(null); setEditing(activity); setError(''); setForm({ title: activity.title, description: activity.description || '', categoryId: activity.categoryId || '', startDate: scope === 'occurrence' ? activity.occurrenceDate : activity.startDate, startTime: activity.startTime || '', endTime: activity.endTime || '', frequency: activity.recurrence?.frequency || '', interval: String(activity.recurrence?.interval || 1), weekdays: activity.recurrence?.weekdays || [], endDate: activity.recurrence?.endDate || '' }); };
  const chooseSeries = async (activity: Activity) => { try { const series = await request<Omit<Activity, 'occurrenceDate' | 'originalDate'>>(`/activities/${activity.id}`); edit({ ...series, occurrenceDate: activity.occurrenceDate, originalDate: activity.originalDate }, 'series'); } catch (e) { setEditChoice(null); setError(e instanceof Error ? e.message : 'Não foi possível carregar a série.'); } };
  const remove = async (activity: Activity, scope: string) => { try { await request(`/activities/${activity.id}?scope=${scope}&date=${activity.originalDate}`, 'DELETE'); setDeleting(null); setForm(null); setEditing(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir a atividade.'); } };
  const saveCategory = async () => { if (!categoryName.trim()) { setError('Informe o nome da categoria.'); return; } try { await request(`/categories${categoryId ? `/${categoryId}` : ''}`, categoryId ? 'PUT' : 'POST', { name: categoryName.trim(), color: categoryColor }); setCategoryId(''); setCategoryName(''); setCategoryColor('#8bbf85'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a categoria.'); } };
  const deleteCategory = async (category: Category) => { if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return; try { await request(`/categories/${category.id}`, 'DELETE'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir a categoria.'); } };
  return <div className="routine-page mx-auto">
    <div className="page-heading"><div><span className="concept-eyebrow">SEU TEMPO, DO SEU JEITO</span><h1>Rotina</h1><p>Organize suas atividades e acompanhe suas tarefas.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { setError(''); setManaging(true); }}><span className="inline-flex items-center gap-2"><Settings2 size={16}/> Categorias</span></Button><Button onClick={() => { setError(''); setEditing(null); setEditScope('series'); setForm(blank(dateString(new Date()))); }}><span className="inline-flex items-center gap-2"><Plus size={16}/> Nova atividade</span></Button></div></div>
    {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
    {todosError && <p role="alert" className="mb-4 text-sm text-danger">{todosError}</p>}
    <div className="routine-calendar-card rounded-xl border border-border-subtle bg-surface p-4 sm:p-6">
      {loading ? <p className="text-sm text-tertiary">Carregando rotina…</p> : <CalendarView date={date} view={view} onDateChange={setDate} onViewChange={setView} activities={activities} todos={todos} categories={categories} onCreate={key => { setEditing(null); setEditScope('series'); setError(''); setForm(blank(key)); }} onEdit={entry => { if (entry.kind === 'activity') { if (entry.value.recurrence || entry.value.isException) setEditChoice(entry.value); else edit(entry.value, 'series'); } else taskActions.openEditModal(entry.value); }} onDelete={entry => { setError(''); if (entry.kind === 'todo') setDeletingTask(entry.value); else if (entry.value.recurrence || entry.value.isException) setDeleting(entry.value); else if (window.confirm('Excluir esta atividade?')) void remove(entry.value, 'series'); }} />}
    </div>
    {taskActions.mutationError && <p role="alert" className="mt-4 text-sm text-danger">{taskActions.mutationError}</p>}
    {taskActions.modalOpen && <TodoModal isEditing={taskActions.isEditing} formData={taskActions.formData} modalError={taskActions.modalError} errorField={taskActions.errorField} onClose={taskActions.closeModal} onUpdateForm={taskActions.updateForm} onToggleRepetition={taskActions.setRepetitionEnabled} onWeekdaysChange={taskActions.setRepetitionWeekdays} onSave={() => void taskActions.saveTodo()} />}
    {deletingTask && <Modal title="Excluir tarefa" onClose={() => setDeletingTask(null)} footer={<><Button variant="ghost" onClick={() => setDeletingTask(null)}>Cancelar</Button><Button onClick={() => { void taskActions.deleteTodo(deletingTask.id); setDeletingTask(null); }}>Excluir</Button></>}><p className="text-sm text-secondary">Deseja excluir a tarefa “{deletingTask.title}”?</p></Modal>}
    {editChoice && <Modal title="Editar atividade recorrente" onClose={() => setEditChoice(null)}><p className="text-sm text-secondary">O que deseja alterar?</p><div className="flex flex-col gap-2"><Button variant="secondary" onClick={() => edit(editChoice, 'occurrence')}>Somente esta ocorrência</Button><Button variant="secondary" onClick={() => void chooseSeries(editChoice)}>Toda a série</Button><Button variant="ghost" onClick={() => setEditChoice(null)}>Cancelar</Button></div></Modal>}
    {form && <Modal title={editing ? (editScope === 'occurrence' ? 'Editar ocorrência' : 'Editar atividade') : 'Nova atividade'} onClose={() => { setForm(null); setEditing(null); setError(''); }} footer={<><Button variant="ghost" onClick={() => { setForm(null); setEditing(null); }}>Cancelar</Button><Button onClick={() => void save()}>Salvar</Button></>}>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {editing && editScope === 'occurrence' && <p className="text-xs text-tertiary">Alterações válidas apenas para esta ocorrência{editing.originalDate !== editing.occurrenceDate ? `, originalmente em ${editing.originalDate.split('-').reverse().join('/')}` : ''}.</p>}
      <Field label="Título"><TextInput aria-label="Título da atividade" value={form.title} onChange={e => update('title', e.target.value)}/></Field>
      <Field label="Descrição (opcional)"><TextArea aria-label="Descrição da atividade" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Adicione uma descrição..." rows={3} maxLength={500}/></Field>
      <Field label="Categoria"><SelectInput label="Categoria da atividade" value={form.categoryId} onValueChange={value => update('categoryId', value)}><option value=""><span className="category-option"><span className="category-swatch is-empty"/>Sem categoria</span></option>{categories.map(c => <option value={c.id} key={c.id}><span className="category-option"><span className="category-swatch" style={{ backgroundColor: c.color }}/>{c.name}</span></option>)}</SelectInput></Field>
      <Field label="Data"><DateInput label="Data da atividade" value={form.startDate} onChange={value => update('startDate', value)} /></Field>
      <div className="time-fields grid grid-cols-2 gap-3"><Field label="Início (opcional)"><TimeInput label="Início da atividade" value={form.startTime} onChange={value => update('startTime', value)}/></Field><Field label="Fim (opcional)"><TimeInput label="Fim da atividade" value={form.endTime} onChange={value => update('endTime', value)}/></Field></div>
      <p className="text-xs text-tertiary">Sem horários, a atividade ocupa o dia inteiro. Para terminar no dia seguinte, informe um horário final anterior ao início.</p>
      {editScope !== 'occurrence' && <RepeatInput label="Repetir atividade" enabled={!!form.frequency} onToggle={enabled => update('frequency', enabled ? 'daily' : '')} interval={form.interval} onIntervalChange={value => update('interval', value)} unit={form.frequency || 'daily'} onUnitChange={value => update('frequency', value)} options={[{ value: 'daily', label: 'Dias' }, { value: 'weekly', label: 'Semanas' }, { value: 'monthly', label: 'Meses' }]} />}
      {editScope !== 'occurrence' && form.frequency === 'weekly' && <WeekdayPicker value={form.weekdays} onChange={days => setForm(current => current && ({ ...current, weekdays: days }))} />}
      {editScope !== 'occurrence' && form.frequency && <Field label="Repetir até (opcional)"><DateInput label="Repetir até" value={form.endDate} onChange={value => update('endDate', value)} /></Field>}
    </Modal>}
    {deleting && <Modal title="Excluir atividade recorrente" onClose={() => setDeleting(null)}><p className="text-sm text-secondary">Como deseja excluir esta atividade?</p><div className="flex flex-col gap-2"><Button variant="secondary" onClick={() => void remove(deleting, 'occurrence')}>Somente esta ocorrência</Button><Button variant="secondary" onClick={() => void remove(deleting, 'future')}>Esta e as próximas ocorrências</Button><Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button></div></Modal>}
    {managing && <Modal title="Categorias" onClose={() => { setManaging(false); setError(''); }}><p className="text-sm text-tertiary">Use cores para distinguir suas atividades no calendário.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="space-y-2">{categories.map(c => <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border-subtle p-3"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }}/><span className="flex-1 text-sm">{c.name}</span><Button variant="ghost" onClick={() => { setCategoryId(c.id); setCategoryName(c.name); setCategoryColor(c.color); }}>Editar</Button><Button variant="icon" aria-label={`Excluir categoria ${c.name}`} onClick={() => void deleteCategory(c)}><Trash2 size={16}/></Button></div>)}</div><Field label={categoryId ? 'Editar categoria' : 'Nova categoria'}><div className="flex gap-2"><TextInput aria-label="Nome da categoria" placeholder="Nome da categoria" value={categoryName} onChange={e => setCategoryName(e.target.value)}/><input aria-label="Cor da categoria" type="color" value={categoryColor} onChange={e => setCategoryColor(e.target.value)}/></div></Field><div className="flex gap-2"><Button onClick={() => void saveCategory()}>{categoryId ? 'Salvar categoria' : 'Adicionar categoria'}</Button>{categoryId && <Button variant="ghost" onClick={() => { setCategoryId(''); setCategoryName(''); }}>Cancelar edição</Button>}</div></Modal>}
  </div>;
}
