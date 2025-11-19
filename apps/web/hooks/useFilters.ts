import { useState, useCallback, useMemo } from 'react';
import { FilterOptions } from '../components/dashboard/StatsFilters';
import { getUnifiedStatusValues } from '@/lib/status-mapping';

export function useFilters(initialFilters: FilterOptions) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  // Memoize processed filters to prevent unnecessary recalculations
  const processedFilters = useMemo(() => ({
    ...filters,
    status: getUnifiedStatusValues(filters.status),
  }), [filters]);

  // Stable callback for updating filters
  const updateFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  // Reset filters to initial state
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    processedFilters,
    updateFilters,
    resetFilters,
  };
}
