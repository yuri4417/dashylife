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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-primary">GameList</h3>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-tertiary">
          Gerencie sua biblioteca de jogos
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-tertiary transition-colors hover:border-border hover:text-primary"
          title="Exportar jogos filtrados"
        >
          <Download size={16} />
        </button>
        <Button variant="primary" onClick={onCreate} className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2">
          <Plus size={16} />
          Novo Jogo
        </Button>
      </div>
    </div>
  );
}
