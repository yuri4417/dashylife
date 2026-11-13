import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { Minus, Plus } from 'lucide-react';
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
        <DateInput label="Data de vencimento" value={formData.dueDate} onChange={(value) => onUpdateForm('dueDate', value)} />
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
              <div className="number-stepper">
                <button type="button" aria-label="Diminuir intervalo" disabled={Number(formData.repetitionInterval) <= 1} onClick={() => onUpdateForm('repetitionInterval', String(Math.max(1, Number(formData.repetitionInterval) - 1)))}><Minus size={16}/></button>
                <input type="number" aria-label="Intervalo" min={1} step={1} value={formData.repetitionInterval} onChange={(event) => onUpdateForm('repetitionInterval', event.target.value)} onBlur={() => onUpdateForm('repetitionInterval', String(Math.max(1, Math.floor(Number(formData.repetitionInterval) || 1))))} />
                <button type="button" aria-label="Aumentar intervalo" onClick={() => onUpdateForm('repetitionInterval', String(Math.max(1, Number(formData.repetitionInterval) || 0) + 1))}><Plus size={16}/></button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-tertiary mb-1.5">Unidade</label>
              <SelectInput
                value={formData.repetitionType}
                label="Unidade"
                onValueChange={(value) => onUpdateForm('repetitionType', value)}
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
