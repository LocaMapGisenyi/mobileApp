import { useEffect, useState, type FormEvent } from 'react';
import { ChevronRight, Plus, Search, RefreshCw } from 'lucide-react';
import { date, Empty, label, Loading, money, Notice, Pagination, Status } from './components';
import { resources } from './resources';
import { useData } from './useData';
import type { PageData, Resource } from './types';
export function ResourceList({ resource, query }: { resource: Resource; query: URLSearchParams }) {
  const config = resources[resource];
  const search = query.get('search') || '';
  const status = query.get('status') || '';
  const page = Math.max(1, Number(query.get('page')) || 1);
  const [input, setInput] = useState(search);
  useEffect(() => setInput(search), [search, resource]);
  const { data, loading, error, reload } = useData<PageData>({
    action: 'list',
    resource,
    search,
    status,
    page,
  });
  const update = (change: Record<string, string | number>) => {
    const next = new URLSearchParams(query);
    for (const [key, value] of Object.entries(change)) {
      if (value) next.set(key, String(value));
      else next.delete(key);
    }
    window.location.hash = `/${resource}?${next}`;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ search: input, page: 1 });
  };
  const detailHref = (id: string) => `#/${resource}/${id}?${query}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          <button
            className="icon-button"
            aria-label="Actualiser les dossiers"
            disabled={loading}
            onClick={reload}
          >
            <RefreshCw size={18} />
          </button>
          {config.fields && (
            <a className="button primary" href={detailHref('new')}>
              <Plus size={18} />
              Créer
            </a>
          )}
          {resource === 'members' && (
            <a className="button primary" href={detailHref('new')}>
              <Plus size={18} />
              Ajouter un accès
            </a>
          )}
        </div>
      </div>
      <div className="list-toolbar">
        <form onSubmit={submit} className="search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label={`Rechercher dans ${config.title}`}
            placeholder="Nom, titre ou référence…"
            value={input}
            maxLength={100}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit">Rechercher</button>
        </form>
        {config.statuses && (
          <label className="filter-label">
            <span>État</span>
            <select value={status} onChange={e => update({ status: e.target.value, page: 1 })}>
              <option value="">Tous les états</option>
              {config.statuses.map(s => (
                <option value={s} key={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <Notice>
          {error}{' '}
          <button className="text-button" onClick={reload}>
            Réessayer
          </button>
        </Notice>
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="data-panel">
              {data.rows.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      {config.columns.map(c => (
                        <th key={c.key} scope="col">
                          {c.label}
                        </th>
                      ))}
                      <th scope="col">
                        <span className="sr-only">Ouvrir</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, index) => (
                      <tr key={row.id || index}>
                        {config.columns.map((col, i) => {
                          const value = row[col.key];
                          const rendered =
                            col.type === 'status' ? (
                              <Status value={value} />
                            ) : col.type === 'date' ? (
                              date(value)
                            ) : col.type === 'money' ? (
                              money(value)
                            ) : typeof value === 'boolean' ? (
                              value ? (
                                'Oui'
                              ) : (
                                'Non'
                              )
                            ) : (
                              label(value)
                            );
                          return (
                            <td key={col.key} data-label={col.label}>
                              {i === 0 ? (
                                <a className="record-link" href={detailHref(String(row.id))}>
                                  {rendered === '—'
                                    ? `Référence ${String(row.id).slice(0, 8)}`
                                    : rendered}
                                </a>
                              ) : (
                                rendered
                              )}
                            </td>
                          );
                        })}
                        <td className="row-open">
                          <a
                            href={detailHref(String(row.id))}
                            aria-label={`Ouvrir ${config.singular.toLowerCase()} ${String(row[config.columns[0].key] || row.id)}`}
                          >
                            <ChevronRight size={18} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty />
              )}
            </div>
            <Pagination
              page={page}
              pageSize={data.pageSize || 25}
              total={data.total}
              onChange={n => update({ page: n })}
            />
          </>
        )
      )}
    </>
  );
}
