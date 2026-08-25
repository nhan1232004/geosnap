import { PushNotifications } from '@capacitor/push-notifications';
import { logError } from '../lib/errorHandler';

let toastInstance: ((message: string, type: 'error' | 'warning' | 'info' | 'success') => void) | null = null;

/**
 * Check if Capacitor PushNotifications plugin is supported on the current platform
 */
export const isPushNotificationsAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'Capacitor' in window && (window as any).Capacitor.isPluginAvailable('PushNotifications');
};

export const initializePushNotifications = async (toast: any) => {
  toastInstance = toast;

  try {
    // Check if plugin is available on current platform
    if (!isPushNotificationsAvailable()) {
      console.log('[PushNotifications] Push notifications not supported on web/current platform.');
      return;
    }

    // Request permission for notifications
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[PushNotifications] Initial permission status:', permStatus);

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[PushNotifications] Notification permission was not granted by user');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();
    console.log('[PushNotifications] Push notifications registered with native service');

    // Remove existing listeners to avoid duplicate firing
    await PushNotifications.removeAllListeners();

    // Listen for notifications when app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      try {
        console.log('[PushNotifications] Push notification received in foreground:', notification);
        handleNotificationReceived(notification);
      } catch (err) {
        logError(err, 'PushNotificationReceivedHandler');
      }
    });

    // Listen for notification taps
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      try {
        console.log('[PushNotifications] User tapped notification action:', notification);
        handleNotificationTapped(notification);
      } catch (err) {
        logError(err, 'PushNotificationTapHandler');
      }
    });

    // Get the device token for sending notifications
    await PushNotifications.addListener('registration', (token: any) => {
      try {
        console.log('[PushNotifications] Device token registered:', token.value);
        savePushToken(token.value);
      } catch (err) {
        logError(err, 'PushRegistrationTokenHandler');
      }
    });

    // Handle registration errors gracefully
    await PushNotifications.addListener('registrationError', (error: any) => {
      const errMsg = error?.error || error?.message || 'Unknown registration error';
      console.error('[PushNotifications] Registration error:', errMsg);
      logError(new Error(errMsg), 'PushRegistrationError');
      if (toastInstance) {
        toastInstance('Không thể kích hoạt push notifications trên thiết bị', 'warning');
      }
    });

  } catch (error) {
    console.error('[PushNotifications] Error initializing push notifications:', error);
    logError(error, 'InitializePushNotifications');
  }
};

const handleNotificationReceived = (notification: any) => {
  const message = notification?.message || notification;
  const title = message?.title || 'GeoSnap';
  const body = message?.body || '';

  console.log(`[PushNotifications] Displaying: ${title} - ${body}`);

  if (toastInstance && body) {
    toastInstance(`${title}: ${body}`, 'info');
  }
};

const handleNotificationTapped = (notification: any) => {
  const notifData = notification?.notification?.data || notification?.data;
  console.log('[PushNotifications] Tapped data:', notifData);

  // Handle navigation based on notification data
  if (notifData?.screen) {
    window.location.href = `/#${notifData.screen}`;
  } else if (notifData?.folderId) {
    window.location.href = `/#/folder/${notifData.folderId}`;
  }
};

const savePushToken = async (token: string) => {
  try {
    const { api } = await import('../lib/api');
    await api.put('/api/v1/users/me', {
      pushToken: token,
    });
    console.log('[PushNotifications] Push token saved to backend successfully');
  } catch (error) {
    console.error('[PushNotifications] Error saving push token to backend:', error);
    logError(error, 'SavePushToken');
  }
};

export const sendTestNotification = async (title: string, body: string) => {
  console.log(`[Test Notification] Title: ${title}, Body: ${body}`);
  if (toastInstance) {
    toastInstance(`[Test] ${title}: ${body}`, 'info');
  }
};
