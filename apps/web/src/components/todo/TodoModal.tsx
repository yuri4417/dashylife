import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { CharCounter, Field, FieldError, SelectInput, TextArea, TextInput } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import type { TodoModalFormData } from '../../hooks/useTodos';

interface TodoModalProps {
  isEditing: boolean;
  formData: TodoModalFormData;
  modalError: string;
  errorField: keyof TodoModalFormData | null;
  onClose: () => void;
  onUpdateForm: (field: keyof TodoModalFormData, value: string) => void;
  onToggleRepetition: (enabled: boolean) => void;
  onSave: () => void;
}

export function TodoModal({
  isEditing,
  formData,
  modalError,
  errorField,
  onClose,
  onUpdateForm,
  onToggleRepetition,
  onSave,
}: TodoModalProps) {
  return (
    <Modal
      title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSave}>
            {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </>
      }
    >
      <Field label="Título">
        <TextInput
          value={formData.title}
          onChange={(e) => onUpdateForm('title', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          placeholder="Título da tarefa..."
          hasError={errorField === 'title'}
        />
        {errorField === 'title' && <FieldError message={modalError} />}
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
        {errorField === 'description' && <FieldError message={modalError} />}
      </Field>

      <Field label="Data de vencimento">
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => onUpdateForm('dueDate', e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary transition-colors focus:border-accent focus:outline-none"
        />
      </Field>

      <div className="space-y-3">
        <Checkbox
          checked={formData.repetitionEnabled}
          onChange={onToggleRepetition}
          label="Repetir tarefa"
        />

        {formData.repetitionEnabled && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-tertiary mb-1.5">Intervalo</label>
              <input
                type="number"
                min={1}
                value={formData.repetitionInterval}
                onChange={(e) => onUpdateForm('repetitionInterval', e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary transition-colors focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-tertiary mb-1.5">Unidade</label>
              <SelectInput
                value={formData.repetitionType}
                onChange={(e) => onUpdateForm('repetitionType', e.target.value)}
              >
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
                <option value="weeks">Semanas</option>
              </SelectInput>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
