import { useRef, useState, type FormEvent } from 'react';
import { Check, MessageSquare, ShieldAlert } from 'lucide-react';
import { api, errorText } from './api';
import { Busy, label, Modal, Notice } from './components';
import { createMutationExecutor } from './mutation';
import { validateDecision } from './validation';
import type { Resource, Role, Row } from './types';
export function useMutation(resource: Resource, row: Row, onDone: (result?: unknown) => void) {
  const execute = useRef(createMutationExecutor(request => api(request)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (payload: Record<string, unknown>) => {
    const invalid = validateDecision(payload);
    if (invalid) {
      setError(invalid);
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const result = await execute.current({
        resource,
        id: row.id,
        expectedVersion: row.version,
        payload,
      });
      onDone(result);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { submit, busy, error, setError };
}
export function DecisionActions({
  resource,
  row,
  role,
  onDone,
}: {
  resource: Resource;
  row: Row;
  role: Role;
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<{
    operation: string;
    title: string;
    danger?: boolean;
  }>();
  const [note, setNote] = useState('');
  const mutation = useMutation(resource, row, () => {
    setDecision(undefined);
    onDone();
  });
  let actions: { operation: string; title: string; danger?: boolean }[] = [];
  if (resource === 'hosts' && row.status === 'PENDING' && ['owner', 'moderator'].includes(role))
    actions = [
      { operation: 'approve', title: 'Valider l’hôte' },
      { operation: 'reject', title: 'Refuser le dossier', danger: true },
    ];
  if (resource === 'properties' && ['owner', 'moderator'].includes(role)) {
    if (row.status === 'PENDING_REVIEW')
      actions.push(
        { operation: 'publish', title: 'Publier l’annonce' },
        { operation: 'return', title: 'Demander une correction' },
      );
    if (row.status === 'ACTIVE' || row.status === 'PAUSED' || row.status === 'PENDING_REVIEW')
      actions.push({ operation: 'suspend', title: 'Suspendre l’annonce', danger: true });
    if (row.status === 'SUSPENDED')
      actions.push({ operation: 'review', title: 'Remettre en examen' });
  }
  if (resource === 'users' && role === 'owner')
    actions =
      row.status === 'SUSPENDED'
        ? [{ operation: 'reactivate', title: 'Réactiver le compte' }]
        : [{ operation: 'suspend', title: 'Suspendre le compte', danger: true }];
  if (resource === 'reports' && ['owner', 'moderator', 'support'].includes(role)) {
    if (row.status === 'REPORTED')
      actions.push({ operation: 'freeze', title: 'Geler la conversation', danger: true });
    if (['REPORTED', 'FROZEN'].includes(String(row.status)))
      actions.push({ operation: 'resolve', title: 'Clore le signalement' });
  }
  if (resource === 'members' && role === 'owner' && row.active !== false)
    actions = [{ operation: 'revoke', title: 'Retirer cet accès', danger: true }];
  if (!actions.length) return null;
  return (
    <>
      <section className="decision-panel">
        <div>
          <ShieldAlert size={20} />
          <h2>Décision</h2>
        </div>
        <p>Vérifiez les informations du dossier. Votre décision et son motif seront enregistrés.</p>
        <div className="action-stack">
          {actions.map((a, i) => (
            <button
              className={`button ${a.danger ? 'danger-outline' : i === 0 ? 'primary' : 'secondary'}`}
              key={a.operation}
              onClick={() => {
                mutation.setError('');
                setNote('');
                setDecision(a);
              }}
            >
              {a.title}
            </button>
          ))}
        </div>
      </section>
      {decision && (
        <Modal title={decision.title} busy={mutation.busy} onClose={() => setDecision(undefined)}>
          <p>
            Cette action concerne{' '}
            <strong>
              {String(row.legal_name || row.full_name || row.title || row.email || row.id)}
            </strong>
            .
          </p>
          {['suspend', 'reactivate'].includes(decision.operation) && (
            <p>Les réservations existantes sont conservées. Cette action ne les annule pas.</p>
          )}
          <form
            onSubmit={async e => {
              e.preventDefault();
              await mutation.submit({ operation: decision.operation, note });
            }}
          >
            <label className="field">
              Motif de la décision
              <textarea
                autoFocus
                required
                maxLength={2000}
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Indiquez les éléments factuels utiles au dossier."
              />
            </label>
            {mutation.error && <Notice>{mutation.error}</Notice>}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={mutation.busy}
                onClick={() => setDecision(undefined)}
              >
                Annuler
              </button>
              <button
                className={`button ${decision.danger ? 'danger' : 'primary'}`}
                disabled={mutation.busy}
              >
                {mutation.busy ? <Busy /> : <Check size={17} />}Confirmer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function TicketActions({
  row,
  assignees,
  onDone,
}: {
  row: Row;
  assignees: Row[];
  onDone: () => void;
}) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState(String(row.status));
  const [priority, setPriority] = useState(String(row.priority));
  const [assigned, setAssigned] = useState(String(row.assigned_to || ''));
  const [note, setNote] = useState('');
  const mutation = useMutation('tickets', row, () => {
    setContent('');
    onDone();
  });
  const update = (e: FormEvent) => {
    e.preventDefault();
    void mutation.submit({
      operation: 'update',
      status,
      priority,
      assigned_to: assigned || null,
      note,
    });
  };
  return (
    <section className="ticket-actions">
      <h2>
        <MessageSquare size={20} /> Répondre au demandeur
      </h2>
      <p>La réponse sera visible dans son ticket et dans les notifications de LocaMap.</p>
      <form
        onSubmit={e => {
          e.preventDefault();
          void mutation.submit({ operation: 'reply', content });
        }}
      >
        <label className="field">
          Votre réponse
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            required
            maxLength={10000}
          />
        </label>
        <button className="button primary" disabled={mutation.busy}>
          {mutation.busy && <Busy />}Envoyer la réponse
        </button>
      </form>
      <form className="ticket-routing" onSubmit={update}>
        <h3>Suivi du dossier</h3>
        <div className="form-grid">
          <label className="field">
            État
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {['OPEN', 'IN_PROGRESS', 'WAITING_HOST', 'RESOLVED', 'CLOSED'].map(v => (
                <option value={v} key={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Priorité
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(v => (
                <option value={v} key={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Attribuer à
            <select value={assigned} onChange={e => setAssigned(e.target.value)}>
              <option value="">Non attribué</option>
              {assignees.map(a => (
                <option key={String(a.id || a.user_id)} value={String(a.id || a.user_id)}>
                  {String(a.full_name || a.email || a.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Motif de la mise à jour
          <textarea
            required
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
          />
        </label>
        <button className="button secondary" disabled={mutation.busy}>
          {mutation.busy && <Busy />}Enregistrer le suivi
        </button>
      </form>
      {mutation.error && <Notice>{mutation.error}</Notice>}
    </section>
  );
}
