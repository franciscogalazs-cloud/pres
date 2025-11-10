import React from 'react';
import type { Notification, NotificationSeverity } from '../types';

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const severityStyles: Record<NotificationSeverity, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-amber-500',
};

export const NotificationToast: React.FC<NotificationToastProps> = React.memo(
  ({ notifications, onDismiss }) => {
    if (notifications.length === 0) {
      return null;
    }

    return (
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm px-4 py-3 rounded-xl shadow-lg text-white transition-all duration-300 ${severityStyles[notification.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{notification.message}</p>
              </div>
              <button
                onClick={() => onDismiss(notification.id)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Cerrar notificación"
                title="Cerrar notificación"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

NotificationToast.displayName = 'NotificationToast';
