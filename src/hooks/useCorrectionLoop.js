import { useState, useCallback, useEffect } from 'react';
import { clLoad, clAdd, clDelete, clClearAll, clGetStats, clSimilarity } from '../lib/correctionLoop';

export function useCorrectionLoop() {
  const [pairs, setPairs] = useState(() => clLoad());
  const [stats, setStats] = useState(() => clGetStats());

  const refresh = useCallback(() => {
    setPairs(clLoad());
    setStats(clGetStats());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCorrection = useCallback(
    (rawInput, aiOutput, editorCorrection, format, bulletinType) => {
      const pair = clAdd(rawInput, aiOutput, editorCorrection, format, bulletinType);
      refresh();
      return pair;
    },
    [refresh]
  );

  const deleteCorrection = useCallback(
    (id) => {
      clDelete(id);
      refresh();
    },
    [refresh]
  );

  const clearAll = useCallback(() => {
    clClearAll();
    refresh();
  }, [refresh]);

  const previewSimilarity = useCallback((original, edited) => clSimilarity(original, edited), []);

  return { pairs, stats, addCorrection, deleteCorrection, clearAll, previewSimilarity };
}
