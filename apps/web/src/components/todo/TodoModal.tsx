import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { TimeInput } from '../ui/TimeInput';
import { RepeatInput } from '../ui/RepeatInput';
import { WeekdayPicker } from '../ui/WeekdayPicker';
import { CharCounter, Field, FieldError, TextArea, TextInput } from '../ui/FormField';
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
  onWeekdaysChange: (days: number[]) => void;
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
  onWeekdaysChange,
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
        {errorField === 'dueDate' && <FieldError message={modalError} />}
      </Field>

      <div className="time-fields grid grid-cols-2 gap-3">
        <Field label="Início (opcional)"><TimeInput label="Início da tarefa" value={formData.startTime} onChange={(value) => onUpdateForm('startTime', value)} /></Field>
        <Field label="Fim (opcional)"><TimeInput label="Fim da tarefa" value={formData.endTime} onChange={(value) => onUpdateForm('endTime', value)} /></Field>
      </div>
      <p className="text-xs text-tertiary">Sem horários, a tarefa ocupa o dia inteiro.</p>
      {errorField === 'startTime' && <FieldError message={modalError} />}

      <RepeatInput enabled={formData.repetitionEnabled} onToggle={onToggleRepetition} label="Repetir tarefa" interval={formData.repetitionInterval} onIntervalChange={value => onUpdateForm('repetitionInterval', value)} unit={formData.repetitionType} onUnitChange={value => onUpdateForm('repetitionType', value)} options={[{ value: 'hours', label: 'Horas' }, { value: 'days', label: 'Dias' }, { value: 'weeks', label: 'Semanas' }]} />
      {formData.repetitionEnabled && formData.repetitionType === 'weeks' && <WeekdayPicker value={formData.repetitionWeekdays} onChange={onWeekdaysChange} />}
      {formData.repetitionEnabled && formData.repetitionType === 'weeks' && formData.repetitionWeekdays.length > 0 && formData.dueDate && !formData.repetitionWeekdays.includes(new Date(`${formData.dueDate}T00:00:00Z`).getUTCDay()) && <p className="text-xs text-tertiary">A data de vencimento também será uma ocorrência, mesmo fora dos dias selecionados.</p>}
    </Modal>
  );
}
