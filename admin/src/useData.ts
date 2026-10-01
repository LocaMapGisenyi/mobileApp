import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from './api';
export function useData<T>(request: Record<string, unknown>) {
  const key = JSON.stringify(request);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ loading: true });
    api<T>(JSON.parse(key), controller.signal)
      .then(data => {
        if (active) setState({ data, loading: false });
      })
      .catch(e => {
        if (active) setState({ loading: false, error: errorText(e) });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, revision]);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  return { ...state, reload };
}
