import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

/** Loads an API resource, reloading whenever the screen comes back into focus. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<T>(path);
      if (alive.current) {
        setData(result);
        setError(undefined);
      }
    } catch (e) {
      if (!(e instanceof ApiError)) console.error(`Failed to load ${path}`, e);
      if (alive.current) setError(e instanceof ApiError ? e : new ApiError(500, "error"));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, loading, reload };
}

/** Runs a change (create/update/delete), tracking busy state and a user-readable error. */
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, clearError: () => setError(undefined) };
}
