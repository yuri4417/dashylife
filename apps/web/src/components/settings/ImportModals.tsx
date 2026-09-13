import { useRef } from 'react';
import { FileJson, Upload, X } from 'lucide-react';
import type { Game } from '@dashylife/shared';
import type { ImportError } from '../../hooks/useGameImport';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ImportModalProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onProcess: () => void;
}

export function ImportModal({ file, onFileChange, onClose, onProcess }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileChange(null);
  };

  return (
    <Modal
      title="Importar Biblioteca"
      onClose={onClose}
      icon={<FileJson size={20} className="text-accent" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onProcess} disabled={!file} className="flex items-center gap-2">
            <Upload size={16} /> Processar
          </Button>
        </>
      }
    >
      <div>
        <label className="block text-sm font-medium text-tertiary mb-1.5">Arquivo JSON</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
          id="import-json-file"
        />
        <label
          htmlFor="import-json-file"
          className="flex items-center justify-center gap-2 w-full px-4 py-8 text-sm bg-surface border border-border border-dashed text-tertiary hover:text-primary hover:border-accent/30 hover:bg-surface-active cursor-pointer rounded-lg transition-colors"
        >
          <Upload size={20} />
          <span className="truncate">
            {file ? file.name : 'Clique para selecionar o arquivo JSON'}
          </span>
        </label>
        {file && (
          <div className="mt-2 flex items-center justify-between p-2 bg-surface-active border border-border/50 rounded-xl">
            <span className="text-sm text-primary truncate mr-2 flex items-center gap-2">
              <FileJson size={14} className="flex-shrink-0" />
              {file.name}
            </span>
            <button
              type="button"
              onClick={clearFile}
              className="text-tertiary hover:text-danger transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-active"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-tertiary">
          Formato esperado: array de objetos com name, launcher, status, date, description, tags
        </p>
      </div>
    </Modal>
  );
}

interface ImportReviewModalProps {
  errors: ImportError[];
  validImports: Game[];
  onClose: () => void;
  onApply: () => void;
}

export function ImportReviewModal({ errors, validImports, onClose, onApply }: ImportReviewModalProps) {
  return (
    <Modal
      title="Revisar Importação"
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Ignorar tudo
          </Button>
          <Button variant="primary" onClick={onApply} disabled={validImports.length === 0}>
            Importar válidos ({validImports.length})
          </Button>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-red-400 mb-2">Itens com erro ({errors.length})</h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {errors.map((err, idx) => (
              <li
                key={err.index >= 0 ? `error-${err.index}` : `error-fallback-${idx}`}
                className="text-xs text-red-300"
              >
                {err.index >= 0 ? `Item ${err.index + 1}: ` : ''}
                {err.errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {validImports.length > 0 && (
        <div className="mb-5 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-green-400 mb-2">
            Itens válidos ({validImports.length})
          </h4>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {validImports.map((g) => (
              <li key={g.id} className="text-xs text-primary">
                {g.title} ({g.platform}) - {g.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
