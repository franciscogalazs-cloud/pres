import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ===== Tipos =====

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  lastSeen: number;
}

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  context?: {
    type: 'apu' | 'presupuesto' | 'recurso' | 'general';
    refId?: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'export' | 'comment' | 'version';
  message: string;
  timestamp: number;
}

export interface VersionItem {
  id: string;
  label: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

interface CollabState {
  users: Record<string, PresenceUser>;
  comments: CommentItem[];
  activity: ActivityItem[];
  versions: VersionItem[];
}

interface CollabContextValue {
  state: CollabState;
  addComment: (text: string, author?: string, context?: CommentItem['context']) => void;
  addActivity: (type: ActivityItem['type'], message: string) => void;
  addVersion: (label: string, payload: Record<string, unknown>) => void;
  clearComments: () => void;
}

// ===== Constantes =====

const STORAGE_KEY = 'apu-collab';
const CHANNEL_NAME = 'apu-collab';
const PRESENCE_INTERVAL_MS = 10_000;
const PRESENCE_TTL_MS = 30_000;
const COMMENT_LIMIT = 200;
const ACTIVITY_LIMIT = 200;
const VERSION_LIMIT = 50;

const initialState: CollabState = {
  users: {},
  comments: [],
  activity: [],
  versions: [],
};

const CollabContext = createContext<CollabContextValue | null>(null);

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'] as const;

const pickColor = (id: string) => COLORS[Math.abs(hashCode(id)) % COLORS.length];

function hashCode(str: string) {
  let hash = 0;
  for (let idx = 0; idx < str.length; idx += 1) {
    hash = Math.imul(31, hash) + str.charCodeAt(idx);
  }
  return hash;
}

const safeParseState = (): CollabState => {
  if (typeof window === 'undefined') {
    return initialState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }

    const parsed = JSON.parse(raw) as Partial<CollabState>;
    return {
      users: parsed.users ?? {},
      comments: Array.isArray(parsed.comments) ? parsed.comments.slice(-COMMENT_LIMIT) : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity.slice(0, ACTIVITY_LIMIT) : [],
      versions: Array.isArray(parsed.versions) ? parsed.versions.slice(0, VERSION_LIMIT) : [],
    };
  } catch (error) {
    console.warn('No se pudo restaurar el estado de colaboracion:', error);
    return initialState;
  }
};

const pruneUsers = (users: Record<string, PresenceUser>): Record<string, PresenceUser> => {
  const now = Date.now();
  const next: Record<string, PresenceUser> = {};

  for (const user of Object.values(users)) {
    if (now - user.lastSeen <= PRESENCE_TTL_MS) {
      next[user.id] = user;
    }
  }

  return next;
};

// ===== Provider =====

export const CollabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CollabState>(() => safeParseState());

  const channelRef = useRef<BroadcastChannel | null>(null);
  const userId = useMemo(() => `user-${Math.random().toString(36).slice(2, 7)}`, []);
  const username = useMemo(() => `Usuario ${userId.slice(-3)}`, [userId]);
  const userIdRef = useRef<string>(userId);
  const usernameRef = useRef<string>(username);

  // Persistencia en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('No se pudo persistir el estado de colaboracion:', error);
    }
  }, [state]);

  // Canal de broadcast multi pestaña
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'presence': {
          const user = payload as PresenceUser;
          setState((prev) => ({
            ...prev,
            users: pruneUsers({ ...prev.users, [user.id]: user }),
          }));
          break;
        }
        case 'comment': {
          setState((prev) => ({
            ...prev,
            comments: [...prev.comments, payload].slice(-COMMENT_LIMIT),
          }));
          break;
        }
        case 'activity': {
          setState((prev) => ({
            ...prev,
            activity: [payload, ...prev.activity].slice(0, ACTIVITY_LIMIT),
          }));
          break;
        }
        case 'version': {
          setState((prev) => ({
            ...prev,
            versions: [payload, ...prev.versions].slice(0, VERSION_LIMIT),
          }));
          break;
        }
        default:
          break;
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // Presencia
  useEffect(() => {
    const broadcastPresence = () => {
      const me: PresenceUser = {
        id: userIdRef.current,
        name: usernameRef.current,
        color: pickColor(userIdRef.current),
        lastSeen: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        users: pruneUsers({ ...prev.users, [me.id]: me }),
      }));

      channelRef.current?.postMessage({
        type: 'presence',
        payload: me,
      });
    };

    broadcastPresence();
    const intervalId = window.setInterval(broadcastPresence, PRESENCE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const addActivity = useCallback((type: ActivityItem['type'], message: string) => {
    const item: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      activity: [item, ...prev.activity].slice(0, ACTIVITY_LIMIT),
    }));

    channelRef.current?.postMessage({ type: 'activity', payload: item });
  }, []);

  const addComment = useCallback(
    (text: string, author?: string, context?: CommentItem['context']) => {
      const item: CommentItem = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        author: author || usernameRef.current,
        text,
        createdAt: Date.now(),
        context: context || { type: 'general' },
      };

      setState((prev) => ({
        ...prev,
        comments: [...prev.comments, item].slice(-COMMENT_LIMIT),
      }));

      channelRef.current?.postMessage({ type: 'comment', payload: item });
      addActivity('comment', `${item.author} comento: "${text}"`);
    },
    [addActivity],
  );

  const addVersion = useCallback(
    (label: string, payload: Record<string, unknown>) => {
      const item: VersionItem = {
        id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        timestamp: Date.now(),
        payload,
      };

      setState((prev) => ({
        ...prev,
        versions: [item, ...prev.versions].slice(0, VERSION_LIMIT),
      }));

      channelRef.current?.postMessage({ type: 'version', payload: item });
      addActivity('version', `Nueva version guardada: "${label}"`);
    },
    [addActivity],
  );

  const clearComments = useCallback(() => {
    setState((prev) => ({ ...prev, comments: [] }));
  }, []);

  const value = useMemo<CollabContextValue>(
    () => ({
      state,
      addComment,
      addActivity,
      addVersion,
      clearComments,
    }),
    [state, addComment, addActivity, addVersion, clearComments],
  );

  return (
    <CollabContext.Provider value={value}>
      {children}
    </CollabContext.Provider>
  );
};

export const useCollab = () => {
  const context = useContext(CollabContext);
  if (!context) {
    throw new Error('useCollab must be used within CollabProvider');
  }
  return context;
};

// ===== UI lateral =====

export const CollabSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { state, addComment, clearComments } = useCollab();
  const [text, setText] = useState('');

  const users = useMemo(
    () => Object.values(state.users).sort((a, b) => b.lastSeen - a.lastSeen),
    [state.users],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 p-4 overflow-y-auto"
          aria-label="Panel de colaboracion"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Colaboracion</h2>
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              Cerrar
            </button>
          </div>

          <div className="mb-4">
            <div className="text-sm text-slate-500 mb-1">En linea</div>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: user.color }} />
                  <span className="text-xs">{user.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Comentarios</div>
            <div className="space-y-2">
              {state.comments.slice(-50).map((comment) => (
                <div key={comment.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500 mb-1">
                    {new Date(comment.createdAt).toLocaleString('es-CL')} · {comment.author}
                  </div>
                  <div className="text-sm">{comment.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                placeholder="Escribe un comentario..."
                aria-label="Nuevo comentario"
              />
              <button
                onClick={() => {
                  if (text.trim()) {
                    addComment(text.trim());
                    setText('');
                  }
                }}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enviar
              </button>
            </div>
            {state.comments.length > 0 && (
              <button
                onClick={clearComments}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Limpiar comentarios
              </button>
            )}
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Actividad</div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {state.activity.slice(0, 50).map((activity) => (
                <div key={activity.id} className="text-xs text-slate-500">
                  {new Date(activity.timestamp).toLocaleTimeString('es-CL')} · {activity.message}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Versiones</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {state.versions.map((version) => (
                <div key={version.id} className="text-xs text-slate-500">
                  {new Date(version.timestamp).toLocaleString('es-CL')} · {version.label}
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
