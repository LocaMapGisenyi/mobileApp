import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api, configured, errorText, supabase } from './api';
import { Busy, Logo, Notice } from './components';
import { normalizeError } from './validation';
import type { AdminSession } from './types';
import gisenyi from '../../src/assets/images/gisenyi_header.png';
export function AuthScreen({
  session,
  onReady,
  denied,
}: {
  session?: AdminSession;
  onReady: (s: AdminSession) => void;
  denied?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [factor, setFactor] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [sent, setSent] = useState(false);
  const refresh = async () => onReady(await api<AdminSession>({ action: 'session' }));
  useEffect(() => {
    if (!session?.mfaRequired) return;
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error: e }) => {
      if (!active) return;
      if (e) setError(normalizeError(e));
      else setFactor(data.totp.find(f => f.status === 'verified')?.id || '');
    });
    return () => {
      active = false;
    };
  }, [session?.user.id, session?.mfaRequired]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (session?.mfaRequired) {
        if (!factor) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          for (const f of factors?.all.filter(
            f => f.factor_type === 'totp' && f.status === 'unverified',
          ) ?? [])
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          const { data, error: e } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'LocaMap administration',
          });
          if (e) throw e;
          setFactor(data.id);
          setQr(data.totp.qr_code);
          setSecret(data.totp.secret);
        } else {
          const { error: e } = await supabase.auth.mfa.challengeAndVerify({
            factorId: factor,
            code: code.replace(/\s/g, ''),
          });
          if (e) throw e;
          setQr('');
          setSecret('');
          await refresh();
        }
      } else if (mode === 'reset') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (e) throw e;
        setSent(true);
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (e) throw e;
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error && e.name === 'ApiError' ? errorText(e) : normalizeError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Logo large />
        <div>
          <span className="location-label">Gisenyi · Rwanda</span>
          <h1>Un accueil de confiance commence ici.</h1>
          <p>
            Les hôtes, les logements et les échanges de LocaMap, réunis dans votre espace de
            gestion.
          </p>
        </div>
        <img className="auth-photo" src={gisenyi} alt="Les rives du lac à Gisenyi" />
        <footer>LocaMap · Administration</footer>
      </section>
      <section className="auth-main">
        <div className="auth-form">
          <div className="mobile-brand">
            <Logo />
          </div>
          <span className="security-label">
            <ShieldCheck size={18} /> Espace réservé à l’équipe
          </span>
          <h2>
            {session?.mfaRequired
              ? 'Vérification en deux étapes'
              : mode === 'reset'
                ? 'Retrouver votre accès'
                : 'Bienvenue dans votre espace'}
          </h2>
          <p>
            {session?.mfaRequired
              ? 'Protégez l’accès aux dossiers avec une application d’authentification.'
              : mode === 'reset'
                ? 'Recevez un lien de récupération à l’adresse de votre compte.'
                : 'Connectez-vous avec votre compte administrateur LocaMap.'}
          </p>
          {!configured && (
            <Notice>
              Le site attend sa configuration Supabase. Consultez le guide de démarrage de
              l’administration.
            </Notice>
          )}
          {denied && <Notice>{denied}</Notice>}
          {error && <Notice>{error}</Notice>}
          {sent && (
            <Notice success>
              Si cette adresse est reconnue, un lien de récupération vous sera envoyé.
            </Notice>
          )}
          <form onSubmit={submit}>
            {session?.mfaRequired ? (
              <>
                {qr && (
                  <div className="mfa-setup">
                    <img
                      src={
                        qr.startsWith('data:')
                          ? qr
                          : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`
                      }
                      alt="QR code à scanner dans votre application d’authentification"
                    />
                    <details>
                      <summary>Configurer sans scanner</summary>
                      <p className="secret">{secret}</p>
                    </details>
                  </div>
                )}
                {factor && (
                  <label className="field">
                    Code à six chiffres
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9 ]{6,9}"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                      autoFocus
                      maxLength={9}
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <label className="field">
                  Adresse email
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    required
                  />
                </label>
                {mode === 'login' && (
                  <label className="field">
                    Mot de passe
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </label>
                )}
              </>
            )}
            <button className="button primary full" disabled={busy || !configured}>
              {busy ? <Busy /> : null}
              {session?.mfaRequired
                ? factor
                  ? 'Vérifier le code'
                  : 'Configurer la protection'
                : mode === 'reset'
                  ? 'Envoyer le lien'
                  : 'Se connecter'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          {session ? (
            <button className="text-button" onClick={() => supabase.auth.signOut()}>
              Utiliser un autre compte
            </button>
          ) : import.meta.env.VITE_PASSWORD_RECOVERY_ENABLED === 'true' ? (
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === 'login' ? 'reset' : 'login');
                setError('');
                setSent(false);
              }}
            >
              {mode === 'login' ? 'Mot de passe oublié ?' : 'Revenir à la connexion'}
            </button>
          ) : (
            <a className="text-button" href="mailto:peter23xp@gmail.com">
              Contacter le responsable pour retrouver un accès
            </a>
          )}
          <p className="auth-help">
            L’accès est attribué par le responsable LocaMap. Un compte locataire ou hôte ne donne
            pas accès à l’administration.
          </p>
        </div>
      </section>
    </main>
  );
}
export function PasswordRecovery({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <main className="recovery">
      <Logo large />
      <h1>Nouveau mot de passe</h1>
      {error && <Notice>{error}</Notice>}
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password });
          if (error) setError(normalizeError(error));
          else onDone();
          setBusy(false);
        }}
      >
        <label className="field">
          Mot de passe (12 caractères minimum)
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy && <Busy />}Enregistrer
        </button>
      </form>
    </main>
  );
}
