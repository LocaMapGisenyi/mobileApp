import {
  ArrowUpRight,
  BadgeCheck,
  House,
  LifeBuoy,
  MessageSquareWarning,
  RefreshCw,
} from 'lucide-react';
import { useData } from './useData';
import { date, Empty, Loading, Notice, Status } from './components';
import type { Role, Row } from './types';
export function Overview({ role }: { role: Role }) {
  const { data, loading, error, reload } = useData<{
    counts: Record<string, number>;
    recent: Row[];
  }>({ action: 'overview' });
  const queues = [
    {
      resource: 'hosts',
      key: 'hosts_pending',
      name: 'Dossiers hôtes',
      description: 'Identités en attente de vérification',
      icon: BadgeCheck,
      roles: ['owner', 'moderator'],
      status: 'PENDING',
    },
    {
      resource: 'properties',
      key: 'properties_pending',
      name: 'Annonces à examiner',
      description: 'Logements en attente de publication',
      icon: House,
      roles: ['owner', 'moderator'],
      status: 'PENDING_REVIEW',
    },
    {
      resource: 'tickets',
      key: 'tickets_open',
      name: 'Demandes d’assistance',
      description: 'Questions et incidents à prendre en charge',
      icon: LifeBuoy,
      roles: ['owner', 'support'],
      status: 'UNRESOLVED',
    },
    {
      resource: 'reports',
      key: 'reports_open',
      name: 'Signalements',
      description: 'Échanges nécessitant votre attention',
      icon: MessageSquareWarning,
      roles: ['owner', 'moderator', 'support'],
      status: 'UNRESOLVED',
    },
  ].filter(q => q.roles.includes(role));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>À traiter</h1>
          <p>Les dossiers qui ont besoin de votre attention.</p>
        </div>
        <button className="button secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={17} />
          Actualiser
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="work-queue" aria-label="Files de traitement">
              {queues.length ? (
                queues.map(q => (
                  <a
                    key={q.resource}
                    className="queue-row"
                    href={`#/${q.resource}?status=${q.status}`}
                  >
                    <span className="queue-icon">
                      <q.icon size={23} />
                    </span>
                    <div>
                      <h2>{q.name}</h2>
                      <p>{q.description}</p>
                    </div>
                    <span className="queue-count">{data.counts[q.key] ?? '—'}</span>
                    <ArrowUpRight className="queue-arrow" size={20} />
                  </a>
                ))
              ) : (
                <a className="queue-row" href="#/articles">
                  <div>
                    <h2>Votre espace éditorial</h2>
                    <p>Préparez les articles et les guides pour les utilisateurs de LocaMap.</p>
                  </div>
                  <ArrowUpRight size={22} />
                </a>
              )}
            </section>
            <div className="overview-bottom">
              <section>
                <div className="section-heading">
                  <h2>Activité récente</h2>
                  <span>Derniers dossiers</span>
                </div>
                {data.recent.length ? (
                  <div className="recent-list">
                    {data.recent.map((row, i) => (
                      <a key={String(row.id ?? i)} href={`#/${row.resource}/${row.id}`}>
                        <div>
                          <strong>
                            {String(
                              row.title ||
                                row.full_name ||
                                row.subject ||
                                row.legal_name ||
                                'Dossier',
                            )}
                          </strong>
                          <span>{date(row.created_at || row.submitted_at, true)}</span>
                        </div>
                        <Status value={row.status} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="L’activité apparaîtra ici"
                    text="Les nouvelles demandes et les dernières décisions seront affichées au fil de l’utilisation de LocaMap."
                  />
                )}
              </section>
              <aside className="overview-note">
                <h2>Votre point de contrôle</h2>
                <p>
                  Examinez chaque dossier avant de confirmer une décision. Les actions sensibles
                  sont enregistrées dans le journal.
                </p>
                <dl>
                  <div>
                    <dt>Utilisateurs</dt>
                    <dd>{data.counts.users ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Annonces actives</dt>
                    <dd>{data.counts.properties_active ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Réservations en cours</dt>
                    <dd>{data.counts.bookings_active ?? '—'}</dd>
                  </div>
                </dl>
                <p className="small">
                  Les montants des réservations ne représentent pas des paiements encaissés.
                </p>
              </aside>
            </div>
          </>
        )
      )}
    </>
  );
}
