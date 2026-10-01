import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Logo, Notice } from './components';
import './styles.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery">
        <Logo large />
        <h1>Cette page n’a pas pu s’afficher</h1>
        <Notice>Vos données sont conservées. Rechargez l’espace pour reprendre.</Notice>
        <button className="button primary" onClick={() => window.location.reload()}>
          Recharger l’espace
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
