import { useCallback, useEffect, useRef, useState } from 'react';

type State<T> = { data: T | null; loading: boolean; error: string | null };

/** Loading / success / error in one place so every screen handles all three. */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Could not load this content.',
        });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  return { ...state, reload: run, setData: (data: T) => setState({ data, loading: false, error: null }) };
}
