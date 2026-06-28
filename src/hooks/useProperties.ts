import { useState, useEffect, useCallback } from 'react';
import type { Tables } from '../types/database';
import {
  getProperties,
  getPropertyById,
  getMyProperties,
  searchProperties,
} from '../services/property.service';

interface PropertiesState {
  properties: Tables<'properties'>[];
  loading: boolean;
  error: string | null;
}

interface PropertyState {
  property: (Tables<'properties'> & { images: Tables<'property_images'>[] }) | null;
  loading: boolean;
  error: string | null;
}

interface SearchState {
  results: Tables<'properties'>[];
  loading: boolean;
  error: string | null;
}

export function useProperties(filters?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  status?: string;
}) {
  const [state, setState] = useState<PropertiesState>({
    properties: [],
    loading: true,
    error: null,
  });

  const filtersKey = JSON.stringify(filters ?? null);

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const properties = await getProperties(filters);
      setState({ properties, loading: false, error: null });
    } catch (err) {
      setState({ properties: [], loading: false, error: (err as Error).message });
    }
  }, [filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

export function useProperty(id: string | null) {
  const [state, setState] = useState<PropertyState>({
    property: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!id) {
      setState({ property: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const property = await getPropertyById(id);
        if (!cancelled) setState({ property, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ property: null, loading: false, error: (err as Error).message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

export function useMyProperties(ownerId: string | null) {
  const [state, setState] = useState<PropertiesState>({
    properties: [],
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!ownerId) {
      setState({ properties: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const properties = await getMyProperties(ownerId);
      setState({ properties, loading: false, error: null });
    } catch (err) {
      setState({ properties: [], loading: false, error: (err as Error).message });
    }
  }, [ownerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

export function usePropertySearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
  });

  const search = useCallback(
    async (
      query: string,
      filters?: {
        city?: string;
        minPrice?: number;
        maxPrice?: number;
        propertyType?: string[];
      }
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const results = await searchProperties(query, filters);
        setState({ results, loading: false, error: null });
      } catch (err) {
        setState({ results: [], loading: false, error: (err as Error).message });
      }
    },
    []
  );

  return { ...state, search };
}
