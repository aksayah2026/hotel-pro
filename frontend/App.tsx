import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure global foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const AppInner = () => {
  const { isDark } = useTheme();
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // 0. Establish default high-importance Android channel immediately on boot
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5B3FFF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    // 1. Foreground notification received listener
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification Received in Foreground:', notification);
    });

    // 2. Notification tap / interaction listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👉 Notification Clicked/Tapped:', response);
      
      const data = response.notification.request.content.data;
      if (data && navigationRef.isReady()) {
        // Automatically navigate to Booking Details if bookingId is attached, otherwise to Notification Center
        if (data.bookingId) {
          (navigationRef as any).navigate('App', {
            screen: 'BookingDetail',
            params: { id: data.bookingId }
          });
        } else {
          (navigationRef as any).navigate('App', { screen: 'Notification' });
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
