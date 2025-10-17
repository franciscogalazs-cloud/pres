import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification, NotificationSeverity } from '../types';

type NotificationInput =
  | string
  | (Partial<Omit<Notification, 'id' | 'createdAt'>> & {
      message: string;
      id?: string;
    });

const DEFAULT_TTL = 4000;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeInput = (
  input: NotificationInput,
  fallbackType: NotificationSeverity = 'success',
): Notification => {
  if (typeof input === 'string') {
    return {
      id: generateId(),
      message: input,
      type: fallbackType,
      ttl: DEFAULT_TTL,
      createdAt: Date.now(),
      persistent: false,
    };
  }

  return {
    id: input.id ?? generateId(),
    message: input.message,
    type: input.type ?? fallbackType,
    ttl: typeof input.ttl === 'number' ? input.ttl : DEFAULT_TTL,
    createdAt: Date.now(),
    persistent: Boolean(input.persistent),
  };
};

export function useNotifications() {
  // Modo silencioso: desactivar avisos/toasts devolviendo no-ops
  const disabled = true;

  if (disabled) {
    const noopId = '';
    return {
      notifications: [] as Notification[],
      showNotification: (_input: NotificationInput, _type?: NotificationSeverity) => noopId,
      dismissNotification: (_id: string) => {},
      clearNotifications: () => {},
    };
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timers = timersRef.current;
    const timeoutId = timers.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timers.delete(id);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    clearTimer(id);
  }, [clearTimer]);

  const clearNotifications = useCallback(() => {
    timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const showNotification = useCallback(
    (input: NotificationInput, type?: NotificationSeverity) => {
      const notification = normalizeInput(input, type);
      clearTimer(notification.id);
      setNotifications((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === notification.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = notification;
          return next;
        }
        return [...prev, notification];
      });

      if (!notification.persistent && typeof notification.ttl === 'number' && notification.ttl > 0) {
        const timeoutId = window.setTimeout(() => dismissNotification(notification.id), notification.ttl);
        timersRef.current.set(notification.id, timeoutId);
      }

      return notification.id;
    },
    [dismissNotification, clearTimer],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timersRef.current.clear();
    },
    [],
  );

  return {
    notifications,
    showNotification,
    dismissNotification,
    clearNotifications,
  };
}
