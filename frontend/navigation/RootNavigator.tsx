import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import {
  LayoutDashboard, BedDouble, CalendarDays,
} from 'lucide-react-native';

import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen                from '../screens/auth/LoginScreen';
import SubscriptionExpiredScreen  from '../screens/auth/SubscriptionExpiredScreen';
import AccountDeactivatedScreen   from '../screens/auth/AccountDeactivatedScreen';
import DashboardScreen            from '../screens/dashboard/DashboardScreen';
import RevenueReportScreen        from '../screens/dashboard/RevenueReportScreen';
import RoomsScreen                from '../screens/rooms/RoomsScreen';
import RoomDetailScreen           from '../screens/rooms/RoomDetailScreen';
import AddRoomScreen              from '../screens/rooms/AddRoomScreen';
import BookingsScreen             from '../screens/booking/BookingsScreen';
import BookingDetailScreen        from '../screens/booking/BookingDetailScreen';
import SelectDatesScreen          from '../screens/booking/SelectDatesScreen';
import AvailableRoomsScreen       from '../screens/booking/AvailableRoomsScreen';
import CustomerDetailsScreen      from '../screens/booking/CustomerDetailsScreen';
import ConfirmBookingScreen       from '../screens/booking/ConfirmBookingScreen';
import EnterAmountScreen          from '../screens/booking/EnterAmountScreen';
import AddPaymentScreen           from '../screens/booking/AddPaymentScreen';
import CheckOutScreen             from '../screens/booking/CheckOutScreen';
import SettingsScreen             from '../screens/admin/SettingsScreen';
import ConfigScreen               from '../screens/admin/ConfigScreen';
import StaffScreen                from '../screens/admin/StaffScreen';
import PastEventsScreen           from '../screens/booking/PastEventsScreen';
import { Loading }                from '../components/LoadingState';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Bottom Tab Navigator ──────────────────────────────────────
const TabNavigator = () => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
          ...theme.shadow.lg,
        },
        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semiBold as any,
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, React.ReactNode> = {
            Dashboard: <LayoutDashboard size={22} color={color} />,
            Rooms:     <BedDouble      size={22} color={color} />,
            Bookings:  <CalendarDays   size={22} color={color} />,
          };
          return (
            <View style={{
              alignItems: 'center',
              backgroundColor: focused ? colors.primaryLight : 'transparent',
              borderRadius: radius.md,
              padding: focused ? spacing.xs : 0,
              paddingHorizontal: focused ? spacing.sm : 0,
            }}>
              {icons[route.name]}
            </View>
          );
        },
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Rooms"     component={RoomsScreen} />
      <Tab.Screen name="Bookings"  component={BookingsScreen} />
    </Tab.Navigator>
  );
};

// ── Authenticated Stack ───────────────────────────────────────
const AuthenticatedNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main"            component={TabNavigator} />
    {/* Rooms */}
    <Stack.Screen name="RoomDetail"      component={RoomDetailScreen} />
    <Stack.Screen name="AddRoom"         component={AddRoomScreen} />
    {/* Booking Flow */}
    <Stack.Screen name="SelectDates"     component={SelectDatesScreen} />
    <Stack.Screen name="AvailableRooms"  component={AvailableRoomsScreen} />
    <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
    <Stack.Screen name="ConfirmBooking"  component={ConfirmBookingScreen} />
    <Stack.Screen name="EnterAmount"     component={EnterAmountScreen} />
    {/* Booking Actions */}
    <Stack.Screen name="BookingDetail"   component={BookingDetailScreen} />
    <Stack.Screen name="AddPayment"      component={AddPaymentScreen} />
    <Stack.Screen name="CheckOut"        component={CheckOutScreen} />
    <Stack.Screen name="RevenueReport"   component={RevenueReportScreen} />
    <Stack.Screen name="Settings"        component={SettingsScreen} />
    <Stack.Screen name="Config"          component={ConfigScreen} />
    <Stack.Screen name="Staff"           component={StaffScreen} />
    <Stack.Screen name="PastEvents"      component={PastEventsScreen} />
  </Stack.Navigator>
);

// ── Root Navigator ────────────────────────────────────────────
export const RootNavigator = () => {
  const { user, tenant, subscriptionStatus, isLoading } = useAuth();

  if (isLoading) return <Loading message="Starting up…" />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : tenant && !tenant.isActive ? (
        <Stack.Screen name="AccountDeactivated" component={AccountDeactivatedScreen} />
      ) : subscriptionStatus === 'EXPIRED' ? (
        <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen} />
      ) : (
        <Stack.Screen name="App" component={AuthenticatedNavigator} />
      )}
    </Stack.Navigator>
  );

};
