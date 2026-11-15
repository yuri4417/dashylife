import { useCallback, useEffect, useRef, useState } from 'react';

interface CollectionState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export interface Collection<T> extends CollectionState<T> {
  load: () => Promise<void>;
  refresh: () => void;
  updateItems: (update: (items: T[]) => T[]) => void;
}

export function useCollection<T>(fetchItems: () => Promise<T[]>, enabled: boolean, loadError: string): Collection<T> {
  const [state, setState] = useState<CollectionState<T>>({ items: [], loading: true, error: null });
  const pending = useRef<Promise<void> | null>(null);

  const load = useCallback(() => {
    if (pending.current) return pending.current;

    const request = fetchItems().then(
      (items) => {
        if (pending.current === request) setState({ items, loading: false, error: null });
      },
      () => {
        if (pending.current === request) setState((current) => ({ ...current, loading: false, error: loadError }));
      },
    ).finally(() => {
      if (pending.current === request) pending.current = null;
    });
    pending.current = request;
    return request;
  }, [fetchItems, loadError]);

  const refresh = useCallback(() => {
    // An earlier read may have started before the write completed.
    pending.current = null;
    void load();
  }, [load]);

  const updateItems = useCallback((update: (items: T[]) => T[]) => {
    setState((current) => ({ ...current, items: update(current.items), error: null }));
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => { void load(); };
    onFocus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, load]);

  return { ...state, load, refresh, updateItems };
}
