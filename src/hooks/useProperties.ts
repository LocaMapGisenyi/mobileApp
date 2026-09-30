import type { PropertyRow } from '../services/property.service';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '../store/user';
import type { Tables } from '../types/database';
import {
  getProperties,
  getPropertyById,
  getMyProperties,
  searchProperties,
} from '../services/property.service';

interface PropertiesState {
  properties: PropertyRow[];
  loading: boolean;
  error: string | null;
}

interface PropertyState {
  property: (PropertyRow & { images: Tables<'property_images'>[] }) | null;
  loading: boolean;
  error: string | null;
}

interface SearchState {
  results: PropertyRow[];
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

  const generation = useRef(0);
  const filtersKey = JSON.stringify(filters ?? null);

  const fetch = useCallback(async () => {
    const request = ++generation.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const properties = await getProperties(filters);
      if (request === generation.current) setState({ properties, loading: false, error: null });
    } catch (err) {
      if (request === generation.current) setState(prev => ({ ...prev, loading: false, error: (err as Error).message }));
    }
  }, [filtersKey]);

  useEffect(() => {
    void fetch();
    return () => { generation.current++; };
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
  const generation = useRef(0);
  const accountId = useUserStore(state => state.user.id);
  const [state, setState] = useState<PropertiesState>({
    properties: [],
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    const request = ++generation.current;
    if (!ownerId || ownerId !== accountId) {
      setState({ properties: [], loading: false, error: null });
      return;
    }

    setState({ properties: [], loading: true, error: null });
    try {
      const properties = await getMyProperties(ownerId);
      if (request === generation.current) setState({ properties, loading: false, error: null });
    } catch (err) {
      if (request === generation.current) setState({ properties: [], loading: false, error: (err as Error).message });
    }
  }, [ownerId, accountId]);

  useEffect(() => {
    void fetch();
    return () => { generation.current++; };
  }, [fetch]);

  return { ...state, refetch: fetch };
}

export function usePropertySearch() {
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
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
      const request = ++generation.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const results = await searchProperties(query, filters);
        if (request === generation.current) setState({ results, loading: false, error: null });
      } catch (err) {
        if (request === generation.current) setState({ results: [], loading: false, error: (err as Error).message });
      }
    },
    []
  );

  return { ...state, search };
}
