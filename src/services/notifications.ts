import { PushNotifications } from '@capacitor/push-notifications';
import { useToast } from '../components/ToastContainer';

let toastInstance: any = null;

export const initializePushNotifications = async (toast: any) => {
  toastInstance = toast;

  try {
    // Request permission for notifications
    let permStatus = await PushNotifications.checkPermissions();
    console.log('Initial permission status:', permStatus);

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();
    console.log('Push notifications registered');

    // Listen for notifications when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Push notification received:', notification);
      handleNotificationReceived(notification);
    });

    // Listen for notification taps
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('Push notification tapped:', notification);
      handleNotificationTapped(notification);
    });

    // Get the device token for sending notifications
    PushNotifications.addListener('registration', (token: any) => {
      console.log('Device token:', token.value);
      savePushToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Registration error:', error.error);
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

const handleNotificationReceived = (notification: any) => {
  const { title, body, data } = notification.message;
  console.log(`Notification: ${title} - ${body}`);

  if (toastInstance) {
    toastInstance(`${title}: ${body}`, 'info');
  }
};

const handleNotificationTapped = (notification: any) => {
  const { data } = notification.notification;
  console.log('User tapped notification:', data);

  // Handle navigation based on notification data
  if (data?.screen) {
    // Navigate to specified screen
    window.location.href = `/#${data.screen}`;
  }
};

const savePushToken = async (token: string) => {
  try {
    const { api } = await import('../lib/api');
    await api.put('/api/v1/users/me', {
      pushToken: token,
    });
    console.log('Push token saved to backend API');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

export const sendTestNotification = async (title: string, body: string) => {
  // Note: sendActionPerformed is not available in this version of @capacitor/push-notifications
  // Use the actual push notification service to send notifications instead
  console.log(`[Test Notification] Title: ${title}, Body: ${body}`);
};

