import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { seed } from './data.js';
import { restore, STORAGE_KEY, transition } from './model.js';
const Context = createContext(null);
export function Store({ children }) {
  const [storageError, setStorageError] = useState('');
  const [initial] = useState(() => { try { return { state: restore(localStorage.getItem(STORAGE_KEY)), error: '' }; } catch (e) { return { state: seed(), error: e.message }; } });
  const [state, dispatch] = useReducer((_, next) => next, initial.state);
  const current = useRef(state), timer = useRef();
  const [toast, setToast] = useState('');
  useEffect(() => { if (initial.error) setStorageError(`Saved data could not be loaded: ${initial.error} Changes are not saved until you reset in Settings.`); return () => clearTimeout(timer.current); }, [initial]);
  const notify = message => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4000); };
  const act = (type, data = {}, message = 'Changes saved') => {
    const next = transition(current.current, { type, data });
    try { if (!initial.error || type === 'RESET') { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); initial.error = ''; setStorageError(''); } } catch { setStorageError('Browser storage is unavailable or full. Changes remain in this tab but will not survive a reload.'); }
    current.current = next; dispatch(next); if (message && (type === 'SETTINGS' || next.settings[next.session]?.notifications !== false)) notify(message); return next;
  };
  useEffect(() => {
    const sync = e => { if (e.key !== STORAGE_KEY) return; try { const next = restore(e.newValue); current.current = next; dispatch(next); } catch { setStorageError('Another tab saved incompatible data. Current data remains unchanged.'); } };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const user = state.users.find(u => u.id === state.session);
  return <Context.Provider value={{ state, user, act, notify, storageError }}>
    {storageError && <div className="storage-warning" role="alert">{storageError}</div>}{children}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
  </Context.Provider>;
}
export const useStore = () => useContext(Context);
