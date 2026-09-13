import { Download, Plus } from 'lucide-react';
import { useGames } from '../hooks/useGames';
import { Button } from './ui/Button';
import { SearchInput } from './ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from './ui/States';
import { GameCards } from './game/GameCards';
import { GameFilters } from './game/GameFilters';
import { GameModal } from './game/GameModal';
import { GameTable } from './game/GameTable';

export function GameList() {
  const {
    loading,
    error,
    modalOpen,
    isEditing,
    formData,
    searchQuery,
    sortConfig,
    platformFilter,
    statusFilter,
    settings,
    modalError,
    errorField,
    visiblePlatforms,
    allPlatforms,
    filteredGames,
    loadGames,
    setSearchQuery,
    openCreateModal,
    openEditModal,
    closeModal,
    updateForm,
    saveGame,
    deleteGame,
    handleSort,
    handlePlatformFilterChange,
    handleStatusFilterChange,
    handleExportFilteredJSON,
  } = useGames();

  if (!settings.enabled) return null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} onExport={handleExportFilteredJSON} />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto w-full">
        <ListHeader onCreate={openCreateModal} onExport={handleExportFilteredJSON} />
        <ErrorState message={error} onRetry={loadGames} />
      </div>
    );
  }

  const hasActiveFilters = searchQuery || platformFilter.length > 0 || statusFilter.length > 0;

  return (
    <div className="max-w-6xl mx-auto w-full">
      <ListHeader onCreate={openCreateModal} onExport={handleExportFilteredJSON} />
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Pesquisar jogos pelo título..."
      />
      <GameFilters
        allPlatforms={allPlatforms}
        platformFilter={platformFilter}
        statusFilter={statusFilter}
        onPlatformChange={handlePlatformFilterChange}
        onStatusChange={handleStatusFilterChange}
      />

      {filteredGames.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters
              ? 'Nenhum jogo encontrado com esses filtros.'
              : 'Nenhum jogo encontrado. Crie seu primeiro jogo!'
          }
        />
      ) : (
        <>
          <GameCards games={filteredGames} onEdit={openEditModal} onDelete={deleteGame} />
          <GameTable
            games={filteredGames}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            onSort={handleSort}
            onEdit={openEditModal}
            onDelete={deleteGame}
          />
        </>
      )}

      {modalOpen && (
        <GameModal
          isEditing={isEditing}
          formData={formData}
          visiblePlatforms={visiblePlatforms}
          modalError={modalError}
          errorField={errorField}
          onClose={closeModal}
          onUpdateForm={updateForm}
          onSave={saveGame}
        />
      )}
    </div>
  );
}

function ListHeader({ onCreate, onExport }: { onCreate: () => void; onExport: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
      <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-primary">
        GameList
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium text-tertiary border border-border hover:text-primary hover:border-border-subtle transition-colors"
          title="Exportar jogos filtrados"
        >
          <Download size={16} />
        </button>
        <Button
          variant="primary"
          onClick={onCreate}
          className="flex flex-1 sm:flex-none items-center justify-center gap-2 sm:py-2 font-medium"
        >
          <Plus size={16} />
          Novo Jogo
        </Button>
      </div>
    </div>
  );
}
