import { Plus } from 'lucide-react';
import type { Todo } from '@dashylife/shared';
import type { Collection } from '../hooks/useCollection';
import { useTodos } from '../hooks/useTodos';
import { ActionButton } from './ui/Button';
import { SearchInput } from './ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from './ui/States';
import { TodoGroup } from './todo/TodoGroup';
import { TodoModal } from './todo/TodoModal';

export function TodoList({ collection }: { collection: Collection<Todo> }) {
  const {
    loading,
    error,
    mutationError,
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
  } = useTodos(collection);

  if (loading) {
    return (
      <div className="module-page max-w-6xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} />
        <LoadingState />
      </div>
    );
  }

  if (error && collection.items.length === 0) {
    return (
      <div className="module-page max-w-6xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} />
        <ErrorState message={error} onRetry={loadTodos} />
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'Nenhuma tarefa encontrada.'
    : 'Nenhuma tarefa encontrada. Crie sua primeira tarefa!';

  return (
    <div className="module-page max-w-6xl mx-auto w-full">
      <ListHeader onCreate={openCreateModal} />
      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar tarefas..." />
      {error && <ErrorState message={error} onRetry={loadTodos} />}
      {mutationError && <p role="alert" className="text-sm text-danger">{mutationError}</p>}

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
    <div className="page-heading module-heading">
      <div>
        <span className="concept-eyebrow">ORGANIZE SEU TEMPO</span><h1>Tarefas</h1>
        <p>Abra espaço para o que realmente importa.</p>
      </div>
      <ActionButton onClick={onCreate}>
        <Plus size={16} />
        Nova Tarefa
      </ActionButton>
    </div>
  );
}

