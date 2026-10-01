import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  FileText,
  House,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareWarning,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { api, configured, environment, errorText, invitationFlow, supabase } from './api';
import { AuthScreen, PasswordRecovery } from './auth';
import { Busy, label, Loading, Logo, Modal, Notice } from './components';
import { DetailPage } from './DetailPage';
import { Overview } from './Overview';
import { ResourceList } from './ResourceList';
import { resources } from './resources';
import type { AdminSession, Resource } from './types';
const icons = {
  users: Users,
  hosts: BadgeCheck,
  properties: House,
  bookings: ClipboardList,
  tickets: LifeBuoy,
  reports: MessageSquareWarning,
  faq_items: BookOpen,
  guides: BookOpen,
  guide_categories: BookOpen,
  articles: FileText,
  courses: BookOpen,
  course_steps: BookOpen,
  legal_documents: FileText,
  errors: Activity,
  limits: Settings2,
  cleanup: Activity,
  audit: ClipboardList,
  members: ShieldCheck,
};
export default function App() {
  const [session, setSession] = useState<AdminSession>();
  const [loading, setLoading] = useState(configured);
  const [denied, setDenied] = useState('');
  const [recovery, setRecovery] = useState(invitationFlow);
  const [hash, setHash] = useState(window.location.hash);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth <= 900);
  const [logout, setLogout] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    const resize = () => {
      setMobile(window.innerWidth <= 900);
      if (window.innerWidth > 900) setMenu(false);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (menu) document.querySelector<HTMLElement>('.sidebar .nav-item.selected')?.focus();
  }, [menu]);
  useEffect(() => {
    const change = () => {
      setHash(window.location.hash);
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    let request = 0;
    const check = async () => {
      const version = ++request;
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!alive || version !== request) return;
      if (!auth) {
        setSession(undefined);
        setDenied('');
        setLoading(false);
        return;
      }
      try {
        const next = await api<AdminSession>({ action: 'session' });
        if (alive && version === request) {
          setSession(next);
          setDenied('');
        }
      } catch (e) {
        if (alive && version === request) {
          setSession(undefined);
          setDenied(errorText(e));
        }
      } finally {
        if (alive && version === request) setLoading(false);
      }
    };
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setTimeout(() => {
        if (alive) void check();
      }, 0);
    });
    const focus = () => void check();
    window.addEventListener('focus', focus);
    void check();
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      window.removeEventListener('focus', focus);
    };
  }, []);
  if (recovery)
    return (
      <PasswordRecovery
        onDone={() => {
          setRecovery(false);
          window.history.replaceState(null, '', window.location.pathname + '#/');
        }}
      />
    );
  if (loading)
    return (
      <main className="startup">
        <Logo large />
        <Loading text="Ouverture de votre espace…" />
      </main>
    );
  if (!session || session.mfaRequired)
    return (
      <AuthScreen
        session={session}
        denied={denied}
        onReady={s => {
          setDenied('');
          setSession(s);
        }}
      />
    );
  const [path, queryString] = hash.replace(/^#\/?/, '').split('?');
  const [name, id] = path.split('/');
  const resource = name in resources ? (name as Resource) : undefined;
  const query = new URLSearchParams(queryString);
  const allowed = !resource || resources[resource].roles.includes(session.role);
  const groups = [
    { key: 'operations', title: 'Gestion quotidienne' },
    { key: 'content', title: 'Contenus' },
    { key: 'system', title: 'Administration' },
  ];
  return (
    <div className="admin-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={e => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Aller au contenu
      </a>
      <aside inert={mobile && !menu} className={`sidebar ${menu ? 'open' : ''}`}>
        <header className="sidebar-brand">
          <Logo />
          <div>
            <strong>Administration</strong>
            <span>LocaMap · Rwanda</span>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMenu(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </header>
        <nav aria-label="Navigation principale">
          <a
            href="#/"
            aria-current={!resource ? 'page' : undefined}
            className={`nav-item ${!resource ? 'selected' : ''}`}
          >
            <LayoutDashboard size={19} />
            <span>À traiter</span>
          </a>
          {groups.map(group => {
            const items = (Object.keys(resources) as Resource[]).filter(
              key =>
                resources[key].group === group.key && resources[key].roles.includes(session.role),
            );
            return items.length ? (
              <div className="nav-group" key={group.key}>
                <p>{group.title}</p>
                {items.map(key => {
                  const Icon = icons[key];
                  return (
                    <a
                      href={`#/${key}`}
                      key={key}
                      aria-current={resource === key ? 'page' : undefined}
                      className={`nav-item ${resource === key ? 'selected' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{resources[key].title}</span>
                    </a>
                  );
                })}
              </div>
            ) : null;
          })}
        </nav>
        <footer className="sidebar-footer">
          <div className="operator-avatar">{session.user.email.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{session.user.email}</strong>
            <span>{label(session.role)}</span>
          </div>
          <button
            className="icon-button"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            onClick={() => {
              setLogoutError('');
              setLogout(true);
            }}
          >
            <LogOut size={18} />
          </button>
        </footer>
      </aside>
      {menu && (
        <button
          className="menu-overlay"
          aria-label="Fermer la navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace" inert={mobile && menu}>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Ouvrir le menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span>Votre espace de gestion</span>
          </div>
          <div>
            <span className={`environment ${environment === 'Production' ? 'production' : ''}`}>
              <span />
              {environment}
            </span>
            <a
              className="app-link"
              href={import.meta.env.VITE_PUBLIC_APP_URL || 'http://localhost:8097'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir LocaMap
              <ArrowUpRight size={16} />
            </a>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {!allowed ? (
            <Notice>Votre rôle ne donne pas accès à cette rubrique.</Notice>
          ) : resource ? (
            id ? (
              <DetailPage
                key={`${resource}-${id}`}
                resource={resource}
                id={id}
                role={session.role}
                query={query}
              />
            ) : (
              <ResourceList resource={resource} query={query} />
            )
          ) : (
            <Overview role={session.role} />
          )}
        </main>
        <footer className="workspace-footer">
          <span>LocaMap · Administration</span>
          <span>Les décisions sont enregistrées dans le journal.</span>
        </footer>
      </div>
      {logout && (
        <Modal title="Se déconnecter" onClose={() => setLogout(false)} busy={logoutBusy}>
          <p>Vous pourrez vous reconnecter avec votre compte et votre code de vérification.</p>
          {logoutError && <Notice>{logoutError}</Notice>}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={logoutBusy}
              onClick={() => setLogout(false)}
            >
              Rester connecté
            </button>
            <button
              className="button primary"
              disabled={logoutBusy}
              onClick={async () => {
                if (logoutBusy) return;
                setLogoutBusy(true);
                const { error } = await supabase.auth.signOut();
                if (error) setLogoutError('La déconnexion a échoué. Réessayez.');
                else {
                  setSession(undefined);
                  setLogout(false);
                }
                setLogoutBusy(false);
              }}
            >
              {logoutBusy && <Busy />}Se déconnecter
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
