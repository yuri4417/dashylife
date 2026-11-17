import { useCallback, useMemo, useState } from 'react';
import type { Repetition, Todo } from '@dashylife/shared';
import { createTodo, deleteTodo as apiDeleteTodo, updateTodo } from '../utils/api';
import { filterTodos, groupTodosByDate } from '../utils/todoUtils';
import { useBodyScrollLock } from './useBodyScrollLock';
import type { Collection } from './useCollection';

export interface TodoModalFormData {
  title: string;
  description: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  repetitionEnabled: boolean;
  repetitionType: 'hours' | 'days' | 'weeks';
  repetitionInterval: number;
  repetitionWeekdays: number[];
}

const EMPTY_FORM: TodoModalFormData = {
  title: '',
  description: '',
  dueDate: '',
  startTime: '',
  endTime: '',
  repetitionEnabled: false,
  repetitionType: 'days',
  repetitionInterval: 1,
  repetitionWeekdays: [],
};

function toFormData(todo: Todo): TodoModalFormData {
  return {
    title: todo.title,
    description: todo.description || '',
    dueDate: todo.dueDate?.slice(0, 10) || '',
    startTime: todo.startTime || '',
    endTime: todo.endTime || '',
    repetitionEnabled: !!todo.repetition,
    repetitionType: todo.repetition?.type || 'days',
    repetitionInterval: todo.repetition?.interval || 1,
    repetitionWeekdays: todo.repetition?.weekdays || [],
  };
}

export function useTodos({ items: todos, loading, error, load: loadTodos, updateItems }: Collection<Todo>) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TodoModalFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState('');
  const [errorField, setErrorField] = useState<keyof TodoModalFormData | null>(null);

  const isEditing = editingId !== null;

  useBodyScrollLock(modalOpen);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalError('');
    setErrorField(null);
  }, []);

  const openEditModal = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setFormData(toFormData(todo));
    setModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const updateForm = useCallback((field: keyof TodoModalFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setRepetitionWeekdays = useCallback((days: number[]) => {
    setFormData((prev) => ({ ...prev, repetitionWeekdays: days }));
  }, []);

  const setRepetitionEnabled = useCallback((enabled: boolean) => {
    setFormData((prev) => ({ ...prev, repetitionEnabled: enabled }));
  }, []);

  const saveTodo = useCallback(async () => {
    if (!formData.title.trim()) {
      setModalError('O título é obrigatório.');
      setErrorField('title');
      return;
    }
    if (formData.description && formData.description.length > 500) {
      setModalError('A descrição não pode ter mais de 500 caracteres.');
      setErrorField('description');
      return;
    }

    if (!!formData.startTime !== !!formData.endTime || (formData.startTime && formData.endTime === formData.startTime)) {
      setModalError('Informe horários de início e fim válidos.');
      setErrorField('startTime');
      return;
    }
    if (formData.repetitionEnabled && formData.repetitionType === 'weeks' && formData.repetitionWeekdays.length && !formData.dueDate) {
      setModalError('Informe a data da primeira tarefa para repetir nos dias selecionados.');
      setErrorField('dueDate');
      return;
    }
    if (formData.startTime && !formData.dueDate) {
      setModalError('Informe uma data para a tarefa com horário.');
      setErrorField('startTime');
      return;
    }

    try {
      const repetition: Repetition | undefined = formData.repetitionEnabled
        ? { type: formData.repetitionType, interval: Math.max(1, Math.floor(Number(formData.repetitionInterval) || 1)), ...(formData.repetitionType === 'weeks' && formData.repetitionWeekdays.length ? { weekdays: formData.repetitionWeekdays } : {}) }
        : undefined;
      const originalDate = isEditing ? todos.find(todo => todo.id === editingId)?.dueDate : undefined;
      const dueDate = originalDate && originalDate.slice(0, 10) === formData.dueDate ? originalDate : formData.dueDate || undefined;
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        dueDate,
        repetition: repetition ?? null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
      };

      if (isEditing && editingId) {
        const { updated } = await updateTodo(editingId, payload);
        updateItems((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await createTodo({ ...payload, repetition });
        updateItems((prev) => [created, ...prev.filter((todo) => todo.id !== created.id)]);
      }
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa',
      );
    }
  }, [formData, isEditing, editingId, todos, closeModal, updateItems]);

  const completeTodo = useCallback(async (id: string) => {
    setMutationError(null);
    try {
      const { updated, next } = await updateTodo(id, { completed: true });
      updateItems((prev) => {
        const tasks = prev.map((todo) => todo.id === id ? updated : todo);
        return next ? [next, ...tasks.filter((todo) => todo.id !== next.id)] : tasks;
      });
    } catch {
      setMutationError('Não foi possível concluir a tarefa. Tente novamente.');
    }
  }, [updateItems]);

  const deleteTodo = useCallback(async (id: string) => {
    setMutationError(null);
    try {
      await apiDeleteTodo(id);
      updateItems((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setMutationError('Não foi possível excluir a tarefa. Tente novamente.');
    }
  }, [updateItems]);

  const groupedTodos = useMemo(
    () => groupTodosByDate(filterTodos(todos, searchQuery)),
    [todos, searchQuery],
  );

  return {
    todos,
    loading,
    error,
    mutationError,
    modalOpen,
    isEditing,
    editingId,
    formData,
    searchQuery,
    modalError,
    errorField,
    groupedTodos,
    loadTodos,
    setSearchQuery,
    openCreateModal,
    openEditModal,
    closeModal,
    updateForm,
    setRepetitionEnabled,
    setRepetitionWeekdays,
    saveTodo,
    completeTodo,
    deleteTodo,
  };
}
