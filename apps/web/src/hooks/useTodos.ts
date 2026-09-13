import { useCallback, useEffect, useMemo, useState } from 'react';
import { Repetition, Todo } from '@dashylife/shared';
import { createTodo, deleteTodo as apiDeleteTodo, fetchTodos, updateTodo } from '../utils/api';
import { filterTodos, groupTodosByDate } from '../utils/todoUtils';
import { useBodyScrollLock } from './useBodyScrollLock';

export interface TodoModalFormData {
  title: string;
  description: string;
  dueDate: string;
  repetitionEnabled: boolean;
  repetitionType: 'hours' | 'days' | 'weeks';
  repetitionInterval: number;
}

const EMPTY_FORM: TodoModalFormData = {
  title: '',
  description: '',
  dueDate: '',
  repetitionEnabled: false,
  repetitionType: 'days',
  repetitionInterval: 1,
};

function toFormData(todo: Todo): TodoModalFormData {
  return {
    title: todo.title,
    description: todo.description || '',
    dueDate: todo.dueDate || '',
    repetitionEnabled: !!todo.repetition,
    repetitionType: todo.repetition?.type || 'days',
    repetitionInterval: todo.repetition?.interval || 1,
  };
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TodoModalFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState('');
  const [errorField, setErrorField] = useState<keyof TodoModalFormData | null>(null);

  const isEditing = editingId !== null;

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      setTodos(await fetchTodos());
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

    try {
      const repetition: Repetition | undefined = formData.repetitionEnabled
        ? { type: formData.repetitionType, interval: formData.repetitionInterval }
        : undefined;
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        dueDate: formData.dueDate || undefined,
        repetition,
      };

      if (isEditing && editingId) {
        const updated = await updateTodo(editingId, payload);
        setTodos((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await createTodo(payload);
        setTodos((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa',
      );
    }
  }, [formData, isEditing, editingId, closeModal]);

  const removeTodoById = useCallback(async (id: string, logLabel: string) => {
    try {
      await apiDeleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(logLabel, err);
    }
  }, []);

  const completeTodo = useCallback(
    (id: string) => removeTodoById(id, 'Erro ao concluir tarefa:'),
    [removeTodoById],
  );

  const deleteTodo = useCallback(
    (id: string) => removeTodoById(id, 'Erro ao excluir tarefa:'),
    [removeTodoById],
  );

  const groupedTodos = useMemo(
    () => groupTodosByDate(filterTodos(todos, searchQuery)),
    [todos, searchQuery],
  );

  return {
    todos,
    loading,
    error,
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
    saveTodo,
    completeTodo,
    deleteTodo,
  };
}
