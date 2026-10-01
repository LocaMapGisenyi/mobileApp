import { ReferenceField } from './ReferenceField';
import { useState } from 'react';
import { Eye, Save, Send } from 'lucide-react';
import { useMutation } from './Actions';
import { Busy, date, label, Modal, Notice, Status } from './components';
import { buildFields } from './validation';
import { resources } from './resources';
import type { Detail, Resource, Row } from './types';
export function ContentEditor({
  resource,
  detail,
  onDone,
}: {
  resource: Resource;
  detail: Detail;
  onDone: (result?: unknown) => void;
}) {
  const config = resources[resource];
  const draft = detail.related.draft as Row | null;
  const initial =
    draft && typeof draft.fields === 'object' ? (draft.fields as Row) : draft || detail.record;
  const [values, setValues] = useState<Record<string, unknown>>({
    ...(resource === 'articles'
      ? { read_minutes: 5, lang: 'fr' }
      : resource === 'course_steps'
        ? { duration_minutes: 5, position: 0, type: 'article' }
        : {}),
    ...initial,
  });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState('');
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const mutation = useMutation(resource, detail.record, onDone);
  const submit = async (operation: string) => {
    setError('');
    try {
      const fields = buildFields(config.fields!, values, operation === 'publish');
      await mutation.submit({
        operation,
        fields,
        ...(operation === 'publish'
          ? {
              note,
              ...(resource === 'legal_documents'
                ? {
                    legal_identity_confirmed: legalConfirmed,
                    legal_operator_name: legalName,
                    legal_operator_address: legalAddress,
                  }
                : {}),
            }
          : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vérifiez les champs.');
    }
  };
  return (
    <>
      <div className="editor-intro">
        <div>
          <Status value={detail.record.publication_status || 'DRAFT'} />
          <p>Un brouillon reste privé à l’équipe jusqu’à sa publication.</p>
        </div>
        <button className="button secondary" onClick={() => setPreview(true)}>
          <Eye size={17} />
          Aperçu
        </button>
      </div>
      {resource === 'legal_documents' && (
        <Notice>
          Les projets de textes ne sont pas des conditions en vigueur. Complétez l’identité légale
          de l’exploitant et faites approuver la version avant publication.
        </Notice>
      )}
      <form
        className="content-form"
        noValidate
        onSubmit={e => {
          e.preventDefault();
          void submit('save_draft');
        }}
      >
        <div className="form-grid">
          {config.fields?.map(f =>
            ['category_id', 'course_id'].includes(f.key) ? (
              <ReferenceField
                key={f.key}
                resource={f.key === 'category_id' ? 'guide_categories' : 'courses'}
                title={f.key === 'category_id' ? 'Catégorie' : 'Formation'}
                value={String(values[f.key] ?? '')}
                required={f.required}
                onChange={v => setValues(values => ({ ...values, [f.key]: v }))}
              />
            ) : (
              <label
                className={`field ${f.type === 'textarea' ? 'span-full' : ''} ${f.type === 'checkbox' ? 'checkbox-field' : ''}`}
                key={f.key}
              >
                {f.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={Boolean(values[f.key])}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked }))}
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    {f.label}
                    {f.required && <span className="required"> *</span>}
                    {f.type === 'textarea' ? (
                      <textarea
                        required={f.required}
                        rows={f.key === 'content' ? 14 : 4}
                        value={String(values[f.key] ?? '')}
                        onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        required={f.required}
                        value={String(values[f.key] ?? '')}
                        onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      >
                        <option value="">Choisir</option>
                        {f.options?.map(v => (
                          <option key={v} value={v}>
                            {label(v)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required={f.required}
                        type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                        value={String(values[f.key] ?? '')}
                        onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    )}
                  </>
                )}
              </label>
            ),
          )}
        </div>
        {(error || mutation.error) && <Notice>{error || mutation.error}</Notice>}
        <div className="editor-footer">
          <button className="button secondary" disabled={mutation.busy}>
            {mutation.busy ? <Busy /> : <Save size={17} />}Enregistrer le brouillon
          </button>
          <button
            type="button"
            className="button primary"
            disabled={mutation.busy}
            onClick={() => {
              if (!config.fields?.some(f => f.required && !String(values[f.key] ?? '').trim()))
                setPublishing(true);
              else setError('Complétez les champs obligatoires avant de publier.');
            }}
          >
            <Send size={17} />
            Publier
          </button>
        </div>
      </form>
      {Array.isArray(detail.related.history) && detail.related.history.length > 0 && (
        <section className="detail-section">
          <h2>Versions précédentes</h2>
          {(detail.related.history as Row[]).map(item => (
            <details className="history-version" key={String(item.id)}>
              <summary>Version publiée · {date(item.created_at, true)}</summary>
              <article className="content-preview">
                <h3>
                  {String(
                    (item.fields as Row)?.title || (item.fields as Row)?.question || 'Contenu',
                  )}
                </h3>
                <div>
                  {String(
                    (item.fields as Row)?.content ||
                      (item.fields as Row)?.answer ||
                      (item.fields as Row)?.description ||
                      '',
                  )}
                </div>
              </article>
            </details>
          ))}
        </section>
      )}
      {preview && (
        <Modal title="Aperçu du contenu" onClose={() => setPreview(false)}>
          <article className="content-preview">
            <h2>{String(values.title || values.question || '')}</h2>
            <p>{String(values.summary || '')}</p>
            <div>{String(values.content || values.answer || values.description || '')}</div>
          </article>
        </Modal>
      )}
      {publishing && (
        <Modal title="Publier ce contenu" busy={mutation.busy} onClose={() => setPublishing(false)}>
          <p>Cette version remplacera le contenu visible dans LocaMap.</p>
          <label className="field">
            Motif / description de la mise à jour
            <textarea
              value={note}
              maxLength={2000}
              onChange={e => setNote(e.target.value)}
              rows={3}
            />
          </label>
          {resource === 'legal_documents' && (
            <>
              <label className="field">
                Nom légal de l’exploitant
                <input value={legalName} required onChange={e => setLegalName(e.target.value)} />
              </label>
              <label className="field">
                Adresse complète de l’exploitant
                <input
                  value={legalAddress}
                  required
                  onChange={e => setLegalAddress(e.target.value)}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={legalConfirmed}
                  onChange={e => setLegalConfirmed(e.target.checked)}
                />
                Je confirme que l’identité de l’exploitant est complète et que ce texte a été
                approuvé pour publication.
              </label>
            </>
          )}
          {(error || mutation.error) && <Notice>{error || mutation.error}</Notice>}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={mutation.busy}
              onClick={() => setPublishing(false)}
            >
              Annuler
            </button>
            <button
              className="button primary"
              disabled={
                mutation.busy ||
                !note.trim() ||
                (resource === 'legal_documents' &&
                  (!legalConfirmed || !legalName.trim() || !legalAddress.trim()))
              }
              onClick={() => void submit('publish')}
            >
              {mutation.busy && <Busy />}Confirmer la publication
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
