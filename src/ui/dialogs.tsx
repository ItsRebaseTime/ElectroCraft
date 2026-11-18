import { create } from 'zustand';
import { useStore } from '../store/store';
import { Icon } from './Icon';

interface ConfirmState {
  open: boolean;
  message: string;
  confirmLabel: string;
  resolve: ((v: boolean) => void) | null;
}

const useConfirm = create<ConfirmState>(() => ({ open: false, message: '', confirmLabel: 'OK', resolve: null }));

/** Promise based confirmation dialog (window.confirm is unreliable inside desktop webviews). */
export function ask(message: string, confirmLabel = 'OK'): Promise<boolean> {
  return new Promise((resolve) => useConfirm.setState({ open: true, message, confirmLabel, resolve }));
}

export function ConfirmHost() {
  const { open, message, confirmLabel, resolve } = useConfirm();
  if (!open) return null;
  const done = (v: boolean) => {
    useConfirm.setState({ open: false, resolve: null });
    resolve?.(v);
  };
  return (
    <div className="modal-backdrop" onClick={() => done(false)}>
      <div className="modal small" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={() => done(false)}>Cancel</button>
          <button className="primary" autoFocus onClick={() => done(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const notify = useStore((s) => s.notify);
  void notify;
  if (!toast) return null;
  return (
    <div key={toast.id} className={`toast ${toast.kind}`} role="status" onAnimationEnd={() => useStore.setState({ toast: null })}>
      <Icon name={toast.kind === 'error' ? 'error' : 'info'} size={18} /> {toast.text}
    </div>
  );
}
