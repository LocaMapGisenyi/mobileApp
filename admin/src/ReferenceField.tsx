import { useState } from 'react';
import { useData } from './useData';
import type { PageData, Resource } from './types';
export function ReferenceField({
  resource,
  title,
  value,
  onChange,
  required,
}: {
  resource: Resource;
  title: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useData<PageData>({ action: 'list', resource, search, page: 1 });
  return (
    <fieldset className="reference-field">
      <legend>
        {title}
        {required ? ' *' : ''}
      </legend>
      <div className="reference-search">
        <input
          aria-label={`Rechercher : ${title}`}
          placeholder="Rechercher par nom…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="text-button" type="button" onClick={() => setSearch(input)}>
          Chercher
        </button>
      </div>
      <select
        aria-label={title}
        required={required}
        value={value}
        disabled={loading}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{loading ? 'Chargement…' : 'Choisir'}</option>
        {value && !data?.rows.some(r => r.id === value) && (
          <option value={value}>Sélection actuelle · {value.slice(0, 8)}</option>
        )}
        {data?.rows.map(row => (
          <option key={String(row.id)} value={String(row.id)}>
            {String(row.title || row.id)}
            {row.publication_status === 'DRAFT' ? ' (brouillon)' : ''}
          </option>
        ))}
      </select>
      {error && <p role="alert">{error}</p>}
      {data && data.total > 25 && <p>Affinez votre recherche pour trouver un autre résultat.</p>}
    </fieldset>
  );
}
