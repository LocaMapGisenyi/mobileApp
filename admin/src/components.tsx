import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, Inbox, LoaderCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../../assets/icon.png';
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <img
      className={large ? 'logo logo-large' : 'logo'}
      src={logo}
      alt="LocaMap"
      width={large ? 100 : 60}
      height={large ? 100 : 60}
    />
  );
}
export const labels: Record<string, string> = {
  approve: 'Validation',
  reject: 'Refus',
  suspend: 'Suspension',
  reactivate: 'Réactivation',
  publish: 'Publication',
  return: 'Correction demandée',
  review: 'Remise en examen',
  reply: 'Réponse du support',
  update: 'Mise à jour',
  freeze: 'Conversation gelée',
  resolve: 'Résolution',
  grant: 'Accès attribué',
  revoke: 'Accès retiré',
  save_draft: 'Brouillon enregistré',
  view_context: 'Consultation du signalement',
  view_document: 'Consultation d’un justificatif',
  bootstrap_owner: 'Premier administrateur',
  before_status: 'État précédent',
  after_status: 'Nouvel état',
  before_role: 'Rôle précédent',
  after_role: 'Nouveau rôle',
  fields: 'Champs modifiés',
  before_max_units: 'Ancien plafond',
  after_max_units: 'Nouveau plafond',
  before_window_seconds: 'Ancienne fenêtre',
  after_window_seconds: 'Nouvelle fenêtre',
  before_assigned_to: 'Ancien responsable',
  after_assigned_to: 'Nouveau responsable',
  before_priority: 'Ancienne priorité',
  after_priority: 'Nouvelle priorité',
  language: 'Langage inapproprié',
  harassment: 'Harcèlement',
  fraud: 'Fraude présumée',
  spam: 'Messages indésirables',
  UNRESOLVED: 'À traiter',
  PUBLISHED: 'Publié',
  CHANGES_PENDING: 'Modifications en attente',
  HOST: 'Hôtes',
  TENANT: 'Locataires',
  DONE: 'Terminé',
  PENDING: 'À examiner',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  VERIFIED: 'Vérifié',
  NOT_VERIFIED: 'Non vérifié',
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'À examiner',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  INACTIVE: 'Inactif',
  ARCHIVED: 'Archivé',
  FROZEN: 'Gelé',
  REPORTED: 'Signalé',
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  WAITING_HOST: 'En attente du demandeur',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
  NORMAL: 'Normale',
  LOW: 'Faible',
  HIGH: 'Haute',
  URGENT: 'Urgente',
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
  completed: 'Terminée',
  owner: 'Administrateur principal',
  moderator: 'Modération',
  support: 'Assistance',
  editor: 'Édition',
  published: 'Publié',
  draft: 'Brouillon',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  article: 'Article',
  video: 'Vidéo',
  quiz: 'Quiz',
  fr: 'Français',
  en: 'Anglais',
  rw: 'Kinyarwanda',
  sw: 'Swahili',
};
export const label = (value: unknown): string => labels[String(value)] || String(value ?? '—');
export function Status({ value }: { value: unknown }) {
  const s = String(value ?? '');
  const tone =
    /APPROVED|VERIFIED|ACTIVE|RESOLVED|PUBLISHED|completed|approved|published/.test(s) &&
    !/NOT_|INACTIVE/.test(s)
      ? 'success'
      : /REJECTED|SUSPENDED|FROZEN|URGENT|rejected/.test(s)
        ? 'danger'
        : /PENDING|OPEN|HIGH|REPORTED|pending/.test(s)
          ? 'warning'
          : 'neutral';
  return (
    <span className={`status ${tone}`}>
      <span aria-hidden="true" />
      {label(value)}
    </span>
  );
}
export function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div
      className={`notice ${success ? 'notice-success' : ''}`}
      role={success ? 'status' : 'alert'}
    >
      <AlertCircle size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function Loading({ text = 'Chargement des dossiers…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <p>{text}</p>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Busy() {
  return <LoaderCircle size={17} className="spin" aria-hidden="true" />;
}
export function Empty({
  title = 'Aucun dossier dans cette liste',
  text = 'Les nouveaux dossiers apparaîtront ici. Vous pouvez aussi modifier vos filtres.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={34} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function date(value: unknown, time = false): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-RW', {
        dateStyle: 'medium',
        ...(time ? { timeStyle: 'short' as const } : {}),
      }).format(d);
}
export function money(value: unknown): string {
  return value === null || value === undefined
    ? '—'
    : `${new Intl.NumberFormat('fr-RW').format(Number(value))} RWF`;
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (n: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} sur ${total}`
          : '0 résultat'}
      </span>
      <div>
        <button
          className="button secondary compact"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {page} / {last}
        </span>
        <button
          className="button secondary compact"
          disabled={page >= last}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    el?.querySelector<HTMLElement>('textarea, input, select')?.focus();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={e => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button disabled={busy} className="icon-button" aria-label="Fermer" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
