import { Button } from './Button';

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-tertiary text-sm">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-danger text-sm mb-2">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-tertiary text-sm">{message}</p>
    </div>
  );
}
