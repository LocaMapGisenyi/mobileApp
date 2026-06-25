import { useState, useEffect } from 'react';
import { Property } from '../types';
import { useSearchStore } from '../store/search';

/**
 * Hook personnalisé pour récupérer les détails d'un logement à partir de son ID
 *
 * @param id - L'identifiant du logement à récupérer
 * @returns Un objet contenant le logement, l'état de chargement et les erreurs éventuelles
 */
const useListingById = (id: string | undefined) => {
  const { listings } = useSearchStore();
  const [listing, setListing] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID du logement non défini');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const found = listings.find(l => l.id === id) ?? null;
    setListing(found);
    setError(found ? null : 'Logement non trouvé');
    setIsLoading(false);
  }, [id, listings]);

  return { listing, isLoading, error };
};

export default useListingById; 