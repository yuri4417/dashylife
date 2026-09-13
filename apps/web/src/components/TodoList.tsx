import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Todo, Repetition } from '@dashylife/shared';
import { fetchTodos, createTodo, updateTodo, deleteTodo as apiDeleteTodo } from '../utils/api';
import { getDueStatus, formatDate } from '../utils/dateUtils';
import { Plus, Search, X, Trash2, Repeat2, Check } from 'lucide-react';

interface ModalFormData {
  title: string;
  description: string;
  dueDate: string;
  repetitionEnabled: boolean;
  repetitionType: 'hours' | 'days' | 'weeks';
  repetitionInterval: number;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ModalFormData>({
    title: '',
    description: '',
    dueDate: '',
    repetitionEnabled: false,
    repetitionType: 'days',
    repetitionInterval: 1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState('');
  const [errorField, setErrorField] = useState<keyof ModalFormData | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditing = editingId !== null;

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTodos();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', description: '', dueDate: '', repetitionEnabled: false, repetitionType: 'days', repetitionInterval: 1 });
    setModalError('');
    setErrorField(null);
  };

  const openEditModal = (todo: Todo) => {
    setEditingId(todo.id);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate || '',
      repetitionEnabled: !!todo.repetition,
      repetitionType: todo.repetition?.type || 'days',
      repetitionInterval: todo.repetition?.interval || 1,
    });
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', dueDate: '', repetitionEnabled: false, repetitionType: 'days', repetitionInterval: 1 });
    setModalOpen(true);
  };

  const updateForm = (field: keyof ModalFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveTodo = async () => {
    let error: string | null = null;
    let errorField: keyof ModalFormData | null = null;

    if (!formData.title.trim()) {
      error = 'O título é obrigatório.';
      errorField = 'title';
    } else if (formData.description && formData.description.length > 500) {
      error = 'A descrição não pode ter mais de 500 caracteres.';
      errorField = 'description';
    }

    if (error) {
      setModalError(error);
      setErrorField(errorField);
      return;
    }

    try {
      const repetition: Repetition | undefined = formData.repetitionEnabled
        ? { type: formData.repetitionType, interval: formData.repetitionInterval }
        : undefined;

      if (isEditing && editingId) {
        const updated = await updateTodo(editingId, {
          title: formData.title,
          description: formData.description || undefined,
          dueDate: formData.dueDate || undefined,
          repetition,
        });
        setTodos((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const newTodo = await createTodo({
          title: formData.title,
          description: formData.description || undefined,
          dueDate: formData.dueDate || undefined,
          repetition,
        });
        setTodos((prev) => [newTodo, ...prev]);
      }
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa');
    }
  };

  const completeTodo = async (id: string) => {
    try {
      await apiDeleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await apiDeleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  const searchFilteredTodos = useMemo(() => {
    return todos
      .filter((todo) => !todo.completed)
      .filter((todo) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          todo.title.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))
        );
      });
  }, [todos, searchQuery]);

  const groupedTodos = useMemo(() => {
    const groups: Record<string, Todo[]> = {};

    searchFilteredTodos.forEach((todo) => {
      if (!todo.dueDate) {
        const key = 'sem-data';
        if (!groups[key]) groups[key] = [];
        groups[key].push(todo);
      } else {
        const key = todo.dueDate;
        if (!groups[key]) groups[key] = [];
        groups[key].push(todo);
      }
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'sem-data') return -1;
      if (b === 'sem-data') return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => ({ date: key, todos: groups[key] }));
  }, [searchFilteredTodos]);

  const getTodoHighlight = (todo: Todo): string => {
    if (!todo.dueDate) return '';
    const status = getDueStatus(todo.dueDate);
    if (status === 'overdue') return 'overdue';
    if (status === 'due-soon') return 'due-soon';
    return '';
  };

  const getDueDateDisplay = (todo: Todo): string => {
    if (!todo.dueDate) return '';
    const status = getDueStatus(todo.dueDate);
    if (status === 'overdue') return `Vencida em ${formatDate(todo.dueDate)}`;
    if (status === 'due-soon') return `Vence em ${formatDate(todo.dueDate)}`;
    return formatDate(todo.dueDate);
  };

  const formatGroupDate = (dateKey: string): string => {
    if (dateKey === 'sem-data') return 'Sem data';
    const date = new Date(dateKey);
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const day = days[date.getUTCDay()];
    const month = months[date.getUTCMonth()];
    const dayNumber = date.getUTCDate();
    const year = date.getUTCFullYear();
    return `${day}, ${dayNumber} de ${month} de ${year}`;
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-primary">Tarefas</h3>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-pill font-medium text-sm bg-action text-action-text hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-tertiary text-sm">Carregando...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-danger text-sm mb-2">{error}</p>
          <button
            onClick={loadTodos}
            className="px-4 py-2 text-sm font-medium text-primary bg-surface border border-border rounded-pill hover:bg-surface-active transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
        <div className="relative mb-6 sm:mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar tarefas..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-surface border border-border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-pill"
          />
        </div>

        {groupedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-tertiary text-sm">
              {searchQuery ? 'Nenhuma tarefa encontrada.' : 'Nenhuma tarefa encontrada. Crie sua primeira tarefa!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {groupedTodos.map(({ date, todos: groupTodos }) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 h-0.5 bg-border-subtle rounded-full" />
                  <span className="text-sm sm:text-lg font-bold text-primary whitespace-nowrap px-2 sm:px-3 text-center">
                    {formatGroupDate(date)}
                  </span>
                  <div className="flex-1 h-0.5 bg-border-subtle rounded-full" />
                </div>
                <ul className="space-y-3">
                  {groupTodos.map((todo) => {
                    const highlight = getTodoHighlight(todo);
                    return (
                      <li
                        key={todo.id}
                        className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 bg-surface rounded-2xl ${
                          'border border-border/50 hover:border-border'
                        } ${
                          highlight === 'overdue' ? 'border-l-3 border-danger' : ''
                        } ${highlight === 'due-soon' ? 'border-l-3 border-warning' : ''}`}
                      >
                        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                          <input
                            type="checkbox"
                            className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
                            onChange={() => completeTodo(todo.id)}
                            aria-label="Concluir tarefa"
                          />
                          <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                        </div>
                        <div
                          onClick={() => openEditModal(todo)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="flex-1 text-sm text-primary">
                            {todo.title}
                          </span>
                          {todo.description && (
                            <span className="text-xs text-tertiary flex-shrink-0 max-w-[200px] truncate">
                              {todo.description}
                            </span>
                          )}
                        </div>
                        {todo.dueDate && (
                          <span
                            className={`text-xs flex-shrink-0 hidden min-[400px]:inline ${
                              highlight === 'overdue'
                                ? 'text-danger'
                                : highlight === 'due-soon'
                                ? 'text-warning'
                                : 'text-tertiary'
                            }`}
                          >
                            {getDueDateDisplay(todo)}
                          </span>
                        )}
                        {todo.repetition && (
                          <span className="text-xs text-tertiary flex-shrink-0 hidden sm:flex items-center gap-1" title={`Repete a cada ${todo.repetition.interval} ${todo.repetition.type === 'hours' ? 'horas' : todo.repetition.type === 'days' ? 'dias' : 'semanas'}`}>
                            <Repeat2 size={12} /> {todo.repetition.interval}x {todo.repetition.type === 'hours' ? 'h' : todo.repetition.type === 'days' ? 'd' : 'sem'}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTodo(todo.id);
                          }}
                          className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        </>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            className="bg-surface border border-border/50 rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h3 className="text-lg font-semibold text-primary">{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                <button
                  onClick={closeModal}
                  className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-tertiary mb-1.5">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTodo()}
                    placeholder="Título da tarefa..."
                    className={`w-full px-4 py-3 text-sm bg-surface border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-lg ${
                      errorField === 'title' ? 'border-danger' : 'border-border'
                    }`}
                  />
                  {errorField === 'title' && (
                    <p className="mt-1.5 text-xs text-danger">{modalError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-tertiary mb-1.5">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTodo()}
                    placeholder="Adicione uma descrição..."
                    rows={3}
                    maxLength={500}
                    className={`w-full px-4 py-3 text-sm bg-surface border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-lg resize-none ${
                      errorField === 'description' ? 'border-danger' : 'border-border'
                    }`}
                  />
                  <div className="mt-1.5 text-right">
                    <span
                      className={`text-xs font-medium ${
                        formData.description.length > 450 ? 'text-danger' : 'text-tertiary'
                      }`}
                    >
                      {formData.description.length}/500
                    </span>
                  </div>
                  {errorField === 'description' && (
                    <p className="mt-1.5 text-xs text-danger">{modalError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-tertiary mb-1.5">Data de vencimento</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => updateForm('dueDate', e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input
                        type="checkbox"
                        checked={formData.repetitionEnabled}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            repetitionEnabled: e.target.checked,
                          }));
                        }}
                        className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
                      />
                      <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-tertiary">Repetir tarefa</span>
                  </label>

                  {formData.repetitionEnabled && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-tertiary mb-1.5">Intervalo</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.repetitionInterval}
                          onChange={(e) => updateForm('repetitionInterval', e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-tertiary mb-1.5">Unidade</label>
                        <select
                          value={formData.repetitionType}
                          onChange={(e) => updateForm('repetitionType', e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                        >
                          <option value="hours">Horas</option>
                          <option value="days">Dias</option>
                          <option value="weeks">Semanas</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-pill"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveTodo}
                  className="px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill"
                >
                  {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}