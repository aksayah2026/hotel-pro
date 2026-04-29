import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';

export default function AccountDeactivatedScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { logout, tenant } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorBg }]}>
          <ShieldAlert size={64} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any }]}>
          Account Deactivated
        </Text>
        
        <Text style={[styles.message, { color: colors.textSecondary, fontSize: fontSize.md }]}>
          The account for <Text style={{ fontWeight: 'bold' }}>{tenant?.businessName || 'this hotel'}</Text> has been deactivated by the system administrator.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Access to all hotel management features has been suspended. If you believe this is an error, please contact support.
          </Text>
          
          <View style={styles.contactRow}>
            <MessageSquare size={18} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.primary, fontWeight: fontWeight.semiBold as any }]}>
              Reason: Manual Deactivation
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            label="Sign Out" 
            onPress={logout} 
            variant="secondary"
            fullWidth
            icon={<LogOut size={20} color={colors.primary} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 40,
  },
  infoText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
  },
});
