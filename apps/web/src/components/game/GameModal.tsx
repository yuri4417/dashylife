import type { GameStatus } from '@dashylife/shared';
import { GAME_STATUS_OPTIONS } from '../../utils/gameUtils';
import type { GameFormData } from '../../hooks/useGames';
import { Button } from '../ui/Button';
import { CharCounter, Field, FieldError, SelectInput, TextArea, TextInput } from '../ui/FormField';
import { Modal } from '../ui/Modal';

interface GameModalProps {
  isEditing: boolean;
  formData: GameFormData;
  visiblePlatforms: string[];
  modalError: string;
  errorField: keyof GameFormData | null;
  onClose: () => void;
  onUpdateForm: (field: keyof GameFormData, value: string) => void;
  onSave: () => void;
}

export function GameModal({
  isEditing,
  formData,
  visiblePlatforms,
  modalError,
  errorField,
  onClose,
  onUpdateForm,
  onSave,
}: GameModalProps) {
  return (
    <Modal
      title={isEditing ? 'Editar Jogo' : 'Novo Jogo'}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSave}>
            {isEditing ? 'Salvar Alterações' : 'Criar Jogo'}
          </Button>
        </>
      }
    >
      <Field label="Título">
        <TextInput
          value={formData.title}
          onChange={(e) => onUpdateForm('title', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          placeholder="Título do jogo..."
          hasError={errorField === 'title'}
        />
        {errorField === 'title' && <FieldError message={modalError} />}
      </Field>

      <Field label="Plataforma">
        <SelectInput value={formData.platform} onChange={(e) => onUpdateForm('platform', e.target.value)}>
          {visiblePlatforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Status">
        <SelectInput
          value={formData.status}
          onChange={(e) => onUpdateForm('status', e.target.value as GameStatus)}
        >
          {GAME_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Data">
        <input
          type="date"
          value={formData.date}
          onChange={(e) => onUpdateForm('date', e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary transition-colors focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="Descrição (opcional)">
        <TextArea
          value={formData.description}
          onChange={(e) => onUpdateForm('description', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          placeholder="Adicione uma descrição..."
          rows={3}
          maxLength={500}
          hasError={errorField === 'description'}
        />
        <CharCounter current={formData.description.length} max={500} />
      </Field>

      <Field label="Tags (opcional, separadas por vírgula)">
        <TextInput
          value={formData.tags}
          onChange={(e) => onUpdateForm('tags', e.target.value)}
          placeholder="Ex: RPG, Ação, Multiplayer, Favorito"
        />
        <p className="mt-1.5 text-xs text-tertiary">
          As tags serão normalizadas (primeira letra maiúscula) e duplicatas removidas.
        </p>
      </Field>
    </Modal>
  );
}
