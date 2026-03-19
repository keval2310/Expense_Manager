import { useEffect } from 'react';
import { subscribeUserToPush, registerServiceWorker } from '../../lib/notifications';

// NotificationManager only handles:
// 1. Service Worker registration (for PWA + Push)
// 2. Push subscription for super admins
//
// Socket.io connection and toast notifications are handled in Layout.tsx
// to avoid duplicate socket connections.

export const NotificationManager = ({ user }: { user: any }) => {
  useEffect(() => {
    // Register Service Worker for everyone (PWA support)
    registerServiceWorker();

    if (!user || user.role !== 'super_admin') return;

    // Subscribe to browser push notifications
    subscribeUserToPush();

  }, [user]);

  return null;
};
