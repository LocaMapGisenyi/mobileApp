import { useEffect, useState } from 'react';
import { ArrowLeft, FileCheck, RefreshCw } from 'lucide-react';
import { api, errorText } from './api';
import { DecisionActions, TicketActions, useMutation } from './Actions';
import { Busy, date, Empty, label, Loading, Modal, money, Notice, Status } from './components';
import { ContentEditor } from './ContentEditor';
import { resources } from './resources';
import { useData } from './useData';
import { safeImageUrl } from './validation';
import type { Detail, Resource, Role, Row } from './types';
const fieldNames: Record<string, string> = {
  full_name: 'Nom complet',
  email: 'Email',
  phone_number: 'Téléphone',
  legal_name: 'Nom déclaré',
  city: 'Ville',
  district: 'Quartier',
  address: 'Adresse',
  country: 'Pays',
  property_type: 'Type de logement',
  price_per_month: 'Loyer mensuel',
  deposit: 'Dépôt demandé',
  min_duration_months: 'Durée minimale (mois)',
  max_guests: 'Capacité',
  bedrooms: 'Chambres',
  bathrooms: 'Salles de bain',
  area_sqm: 'Surface (m²)',
  latitude: 'Latitude',
  longitude: 'Longitude',
  guest_count: 'Voyageurs',
  total_price: 'Montant prévu',
  currency: 'Devise',
  start_date: 'Arrivée',
  end_date: 'Départ',
  created_at: 'Création',
  submitted_at: 'Soumission',
  reviewed_at: 'Décision',
  review_note: 'Motif de la décision',
  suspended_at: 'Suspension',
  suspension_reason: 'Motif de suspension',
  restriction_note: 'Motif de restriction',
  restriction_updated_at: 'Mise à jour de la restriction',
  moderation_note: 'Note de modération',
  record_id: 'Dossier concerné',
  app_version: 'Version de l’application',
  size: 'Surface (m²)',
  accommodation_type: 'Type d’occupation',
  amenities: 'Équipements',
  smoking_allowed: 'Tabac autorisé',
  pets_allowed: 'Animaux autorisés',
  notice_period_days: 'Préavis (jours)',
  is_host: 'Hôte',
  bio: 'Présentation',
  category: 'Catégorie',
  priority: 'Priorité',
  resolved_at: 'Résolution',
  assigned_to: 'Opérateur attribué',
  name: 'Nom de la limite',
  max_units: 'Unités maximales',
  window_seconds: 'Fenêtre (secondes)',
  code: 'Type d’erreur',
  route: 'Écran',
  platform: 'Plateforme',
  kind: 'Origine',
  action: 'Action',
  resource: 'Ressource',
  actor_id: 'Opérateur',
  target_id: 'Dossier concerné',
  note: 'Motif',
  attempts: 'Tentatives',
  deleted_at: 'Suppression',
  last_error: 'Dernière erreur',
  role: 'Rôle',
  active: 'Accès actif',
};
const fieldSets: Partial<Record<Resource, string[]>> = {
  users: [
    'full_name',
    'email',
    'phone_number',
    'is_host',
    'created_at',
    'restriction_updated_at',
    'restriction_note',
    'bio',
  ],
  hosts: ['legal_name', 'submitted_at', 'reviewed_at', 'review_note'],
  properties: [
    'address',
    'city',
    'district',
    'country',
    'property_type',
    'price_per_month',
    'deposit',
    'moderation_note',
    'min_duration_months',
    'max_guests',
    'bedrooms',
    'bathrooms',
    'size',
    'accommodation_type',
    'amenities',
    'smoking_allowed',
    'pets_allowed',
    'notice_period_days',
    'latitude',
    'longitude',
  ],
  bookings: [
    'start_date',
    'end_date',
    'guest_count',
    'total_price',
    'deposit',
    'currency',
    'created_at',
  ],
  tickets: ['category', 'priority', 'created_at', 'resolved_at'],
  reports: ['created_at'],
  members: ['email', 'full_name', 'role', 'active', 'created_at'],
};
function array(value: unknown): Row[] {
  return Array.isArray(value) ? (value.filter(v => v && typeof v === 'object') as Row[]) : [];
}
function Facts({ row, keys }: { row: Row; keys: string[] }) {
  return (
    <dl className="facts">
      {keys
        .filter(k => row[k] !== null && row[k] !== undefined && row[k] !== '')
        .map(k => (
          <div
            key={k}
            className={
              ['review_note', 'restriction_note', 'moderation_note', 'bio', 'amenities'].includes(k)
                ? 'fact-wide'
                : undefined
            }
          >
            <dt>{fieldNames[k] || k}</dt>
            <dd>
              {k.endsWith('_at') || k.endsWith('_date')
                ? date(row[k], k.endsWith('_at'))
                : k === 'price_per_month' || k === 'total_price' || k === 'deposit'
                  ? money(row[k])
                  : Array.isArray(row[k])
                    ? (row[k] as unknown[]).map(label).join(', ')
                    : typeof row[k] === 'boolean'
                      ? row[k]
                        ? 'Oui'
                        : 'Non'
                      : label(row[k])}
            </dd>
          </div>
        ))}
    </dl>
  );
}
function DocumentViewer({ hostId, keys }: { hostId: string; keys: string[] }) {
  const [url, setUrl] = useState('');
  const [index, setIndex] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => {
      setUrl('');
      setError('L’accès temporaire a expiré. Fermez puis ouvrez à nouveau le document.');
    }, 60000);
    return () => clearTimeout(timer);
  }, [url]);
  const open = async (i: number) => {
    setIndex(i);
    setBusy(true);
    setUrl('');
    setError('');
    try {
      const result = await api<{ url: string }>({
        action: 'document',
        id: hostId,
        payload: { key: keys[i] },
      });
      const safe = safeImageUrl(result.url);
      if (!safe) throw new Error('Invalid URL');
      setUrl(safe);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="detail-section">
      <h2>Justificatifs privés</h2>
      <p>Consultez uniquement les pièces nécessaires à la vérification de ce dossier.</p>
      <div className="documents">
        {keys.map((_, i) => (
          <button className="document-button" key={i} onClick={() => void open(i)}>
            <FileCheck size={23} />
            <span>Justificatif {i + 1}</span>
            <span>Consulter</span>
          </button>
        ))}
      </div>
      {!keys.length && <Notice>Aucun justificatif n’est associé à ce dossier.</Notice>}
      {index !== undefined && (
        <Modal
          title={`Justificatif ${index + 1}`}
          onClose={() => {
            setUrl('');
            setIndex(undefined);
          }}
        >
          <p className="small">Consultation privée · accès temporaire de 60 secondes.</p>
          {busy && <Loading text="Ouverture du document…" />}
          {error && <Notice>{error}</Notice>}
          {url && (
            <img
              className="private-document"
              src={url}
              referrerPolicy="no-referrer"
              alt={`Justificatif ${index + 1} du dossier hôte`}
              onError={() => {
                setUrl('');
                setError(
                  'Le document n’a pas pu être chargé. Rouvrez-le pour renouveler son accès.',
                );
              }}
            />
          )}
        </Modal>
      )}
    </section>
  );
}
function Related({ data }: { data: Detail }) {
  const r = data.related;
  return (
    <>
      {typeof r.active_bookings === 'number' && r.active_bookings > 0 && (
        <Notice>{r.active_bookings} réservation(s) en cours restent associées à ce dossier.</Notice>
      )}
      {(['profile', 'owner', 'guest', 'host'] as const).map(key => {
        const person = r[key] as Row | undefined;
        return person && typeof person === 'object' ? (
          <section className="detail-section" key={key}>
            <h2>
              {{ profile: 'Compte associé', owner: 'Hôte', guest: 'Voyageur', host: 'Hôte' }[key]}
            </h2>
            <Facts row={person} keys={['full_name', 'email', 'phone_number']} />
          </section>
        ) : null;
      })}
      {(['properties', 'bookings', 'tickets'] as Resource[]).map(key =>
        array(r[key]).length ? (
          <section className="detail-section" key={key}>
            <h2>{resources[key].title}</h2>
            <div className="related-list">
              {array(r[key]).map(item => (
                <a key={String(item.id)} href={`#/${key}/${item.id}`}>
                  <span>
                    {String(
                      item.title ||
                        item.subject ||
                        item.property_title ||
                        `Référence ${String(item.id).slice(0, 8)}`,
                    )}
                  </span>
                  <Status value={item.status} />
                </a>
              ))}
            </div>
          </section>
        ) : null,
      )}
      {array(r.messages).length > 0 && (
        <section className="detail-section">
          <h2>Historique des échanges</h2>
          <div className="thread">
            {array(r.messages).map((m, i) => (
              <article
                key={String(m.id || i)}
                className={m.is_support ? 'message support-message' : 'message'}
              >
                <header>
                  <strong>
                    {m.is_support ? 'Équipe LocaMap' : String(m.sender_name || 'Utilisateur')}
                  </strong>
                  <time>{date(m.created_at, true)}</time>
                </header>
                <p>{String(m.content || '')}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {array(r.audit).length > 0 && (
        <section className="detail-section">
          <h2>Historique administratif</h2>
          <div className="audit-history">
            {array(r.audit).map(a => (
              <article key={String(a.id)}>
                <strong>{label(a.action)}</strong>
                <time>{date(a.created_at, true)}</time>
                <p>{String(a.note || 'Action enregistrée')}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {array(r.reports).length > 0 && (
        <section className="detail-section">
          <h2>Motifs signalés</h2>
          {array(r.reports).map((item, i) => (
            <article key={String(item.id || i)}>
              <p>
                {item.category ? label(item.category) : 'Motif non enregistré'} ·{' '}
                {date(item.created_at, true)}
              </p>
              {item.description ? <p>{String(item.description)}</p> : null}
              {item.resolution_note ? <p>Résolution : {String(item.resolution_note)}</p> : null}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
function SettingsEditor({
  resource,
  row,
  onDone,
}: {
  resource: 'limits' | 'members';
  row: Row;
  onDone: (result?: unknown) => void;
}) {
  const mutation = useMutation(resource, row, onDone);
  const [maxUnits, setMaxUnits] = useState(String(row.max_units || ''));
  const [windowSeconds, setWindowSeconds] = useState(String(row.window_seconds || '60'));
  const [userId, setUserId] = useState(String(row.user_id || row.id || ''));
  const [role, setRole] = useState(String(row.role || 'support'));
  const [note, setNote] = useState('');
  return (
    <form
      className="settings-form"
      onSubmit={e => {
        e.preventDefault();
        void mutation.submit(
          resource === 'limits'
            ? {
                operation: 'update',
                max_units: Number(maxUnits),
                window_seconds: Number(windowSeconds),
                note,
              }
            : { operation: 'grant', user_id: userId, role, note },
        );
      }}
    >
      <h2>
        {resource === 'limits'
          ? 'Modifier cette limite'
          : row.id
            ? 'Modifier les droits'
            : 'Attribuer un accès'}
      </h2>
      {resource === 'limits' ? (
        <div className="form-grid">
          <label className="field">
            Unités maximales
            <input
              type="number"
              min={1}
              required
              value={maxUnits}
              onChange={e => setMaxUnits(e.target.value)}
            />
          </label>
          <label className="field">
            Fenêtre (secondes)
            <input
              type="number"
              min={60}
              max={86400}
              required
              value={windowSeconds}
              onChange={e => setWindowSeconds(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <>
          <p>
            Le compte doit déjà exister dans LocaMap. Vous trouverez sa référence dans la fiche
            utilisateur.
          </p>
          <label className="field">
            Référence du compte
            <input
              value={userId}
              required
              pattern="[a-fA-F0-9-]{36}"
              readOnly={Boolean(row.id)}
              onChange={e => setUserId(e.target.value)}
            />
          </label>
          <label className="field">
            Rôle
            <select value={role} onChange={e => setRole(e.target.value)}>
              {['owner', 'moderator', 'support', 'editor'].map(v => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="field">
        Motif
        <textarea
          rows={3}
          required
          value={note}
          maxLength={2000}
          onChange={e => setNote(e.target.value)}
        />
      </label>
      {mutation.error && <Notice>{mutation.error}</Notice>}
      <button className="button primary" disabled={mutation.busy}>
        {mutation.busy && <Busy />}Enregistrer
      </button>
    </form>
  );
}
export function DetailPage({
  resource,
  id,
  role,
  query,
}: {
  resource: Resource;
  id: string;
  role: Role;
  query: URLSearchParams;
}) {
  const config = resources[resource];
  if (id === 'new')
    return (
      <>
        <a className="back-link" href={`#/${resource}?${query}`}>
          <ArrowLeft size={17} />
          {config.title}
        </a>
        <div className="page-heading">
          <h1>Créer · {config.singular}</h1>
        </div>
        {config.fields ? (
          <ContentEditor
            key={resource}
            resource={resource}
            detail={{ record: {}, related: {} }}
            onDone={result => {
              const row = result as Row;
              window.location.hash = `/${resource}/${row.id}`;
            }}
          />
        ) : resource === 'members' && role === 'owner' ? (
          <SettingsEditor
            resource="members"
            row={{}}
            onDone={() => {
              window.location.hash = '/members';
            }}
          />
        ) : (
          <Notice>Cette création n’est pas disponible.</Notice>
        )}
      </>
    );
  return <ExistingDetail resource={resource} id={id} role={role} query={query} />;
}
function ExistingDetail({
  resource,
  id,
  role,
  query,
}: {
  resource: Resource;
  id: string;
  role: Role;
  query: URLSearchParams;
}) {
  const { data, loading, error, reload } = useData<Detail>({ action: 'detail', resource, id });
  const config = resources[resource];
  const [success, setSuccess] = useState('');
  const done = () => {
    setSuccess('La modification a été enregistrée.');
    reload();
  };
  const row = data?.record;
  return (
    <>
      <a className="back-link" href={`#/${resource}?${query}`}>
        <ArrowLeft size={17} />
        {config.title}
      </a>
      <div className="page-heading">
        <div>
          <h1>
            {String(
              row?.title || row?.legal_name || row?.full_name || row?.subject || config.singular,
            )}
          </h1>
          <p className="reference">Référence {id}</p>
        </div>
        <button className="button secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={17} />
          Actualiser
        </button>
      </div>
      {success && <Notice success>{success}</Notice>}
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading />
      ) : data && row ? (
        <>
          {config.fields ? (
            <ContentEditor
              key={`${id}-${row.version}`}
              resource={resource}
              detail={data}
              onDone={done}
            />
          ) : (
            <div className="detail-layout">
              <div className="detail-main">
                {row.status || row.kyc_status ? (
                  <Status value={row.status || row.kyc_status} />
                ) : null}
                {resource === 'properties' && array(data.related.images).length > 0 && (
                  <div className="property-gallery">
                    {array(data.related.images).map((image, i) =>
                      safeImageUrl(image.url) ? (
                        <img
                          key={String(image.id || i)}
                          src={safeImageUrl(image.url)}
                          alt={`Photo ${i + 1} du logement`}
                          loading="lazy"
                        />
                      ) : null,
                    )}
                  </div>
                )}
                <section className="detail-section">
                  <h2>Informations du dossier</h2>
                  <Facts row={row} keys={fieldSets[resource] || Object.keys(fieldNames)} />
                  {resource === 'audit' && row.changes && typeof row.changes === 'object' ? (
                    <div className="audit-history">
                      {Object.entries(row.changes as Record<string, unknown>)
                        .filter(([key]) => !key.endsWith('_version'))
                        .map(([key, value]) => (
                          <p key={key}>
                            <strong>{label(key)}</strong> :{' '}
                            {Array.isArray(value) ? value.map(label).join(', ') : label(value)}
                          </p>
                        ))}
                    </div>
                  ) : null}
                  {row.description ? <p className="multiline">{String(row.description)}</p> : null}
                  {row.message ? <p className="multiline">{String(row.message)}</p> : null}
                  {resource === 'bookings' && (
                    <p className="small">
                      Montant prévu pour le séjour. Aucun encaissement ni remboursement n’est
                      effectué par l’application.
                    </p>
                  )}
                </section>
                {resource === 'hosts' && (
                  <DocumentViewer
                    hostId={id}
                    keys={Array.isArray(row.document_keys) ? (row.document_keys as string[]) : []}
                  />
                )}
                <Related data={data} />
                {resource === 'tickets' && (
                  <TicketActions
                    key={row.version}
                    row={row}
                    assignees={array(data.related.assignees)}
                    onDone={done}
                  />
                )}{' '}
                {resource === 'reports' && !array(data.related.reports).length && (
                  <p className="small">
                    Le motif détaillé n’a pas été enregistré pour ce signalement historique.
                  </p>
                )}
                {resource === 'limits' && (
                  <SettingsEditor key={row.version} resource="limits" row={row} onDone={done} />
                )}{' '}
                {resource === 'members' && (
                  <SettingsEditor key={row.version} resource="members" row={row} onDone={done} />
                )}
              </div>
              <aside>
                <DecisionActions resource={resource} row={row} role={role} onDone={done} />
              </aside>
            </div>
          )}
        </>
      ) : (
        !error && <Empty />
      )}
    </>
  );
}
