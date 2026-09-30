import { useState, useEffect } from 'react';
import { Property } from '../types';
import { propertyService } from '../services/api/property.service';
import { useUserStore } from '../store/user';

const useListingById = (id: string | undefined) => {
  const userId = useUserStore(state => state.user.id);
  const [listing, setListing] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setListing(null); setError(null); setIsLoading(true);
    if (!id) { setError('ID du logement non défini'); setIsLoading(false); return; }
    propertyService.getById(id).then(result => {
      if (!cancelled) setListing(result);
    }).catch(reason => {
      if (!cancelled) setError(reason?.message ?? String(reason));
    }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, userId]);
  return { listing, isLoading, error };
};
export default useListingById;
