import { Plus } from 'lucide-react';
import { useTodos } from '../hooks/useTodos';
import { ActionButton } from './ui/Button';
import { SearchInput } from './ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from './ui/States';
import { TodoGroup } from './todo/TodoGroup';
import { TodoModal } from './todo/TodoModal';

export function TodoList() {
  const {
    loading,
    error,
    modalOpen,
    isEditing,
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
  } = useTodos();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} />
        <ErrorState message={error} onRetry={loadTodos} />
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'Nenhuma tarefa encontrada.'
    : 'Nenhuma tarefa encontrada. Crie sua primeira tarefa!';

  return (
    <div className="max-w-2xl mx-auto w-full">
      <ListHeader onCreate={openCreateModal} />
      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar tarefas..." />

      {groupedTodos.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {groupedTodos.map((group) => (
            <TodoGroup
              key={group.date}
              group={group}
              onEdit={openEditModal}
              onComplete={completeTodo}
              onDelete={deleteTodo}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <TodoModal
          isEditing={isEditing}
          formData={formData}
          modalError={modalError}
          errorField={errorField}
          onClose={closeModal}
          onUpdateForm={updateForm}
          onToggleRepetition={setRepetitionEnabled}
          onSave={saveTodo}
        />
      )}
    </div>
  );
}

function ListHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
      <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-primary">
        Tarefas
      </h3>
      <ActionButton onClick={onCreate}>
        <Plus size={16} />
        Nova Tarefa
      </ActionButton>
    </div>
  );
}

