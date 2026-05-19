import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StatusBar, Alert, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const { login } = useAuth();

  const [mobile, setMobile]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ mobile?: string; password?: string }>({});

  const handleMobileChange = (v: string) => {
    const cleaned = v.replace(/\D/g, "");
    setMobile(cleaned);
    
    // After user interaction (if error is already showing), validate real-time to correct
    if (errors.mobile) {
      if (!cleaned || !/^\d{10}$/.test(cleaned)) {
        setErrors(prev => ({ ...prev, mobile: 'Enter a valid 10-digit mobile number' }));
      } else {
        setErrors(prev => ({ ...prev, mobile: undefined }));
      }
    }
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    
    // After user interaction (if error is already showing), validate real-time to correct
    if (errors.password) {
      if (!v) {
        setErrors(prev => ({ ...prev, password: 'Password is required' }));
      } else {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      e.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!password) {
      e.password = 'Password is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const cleanMobile = mobile.replace(/\D/g, "");
      await login(cleanMobile, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.base }}
          keyboardShouldPersistTaps="handled">

          {/* Logo / Brand */}
          <View style={{ alignItems: 'center', marginBottom: spacing['3xl'] }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{
                width: 200,
                height: 200,
                resizeMode: 'contain',
              }}
            />
            <Text style={{
              fontSize: fontSize.sm,
              color: colors.textMuted,
              letterSpacing: 0.3,
            }}>
              Hotel Management System
            </Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            ...theme.shadow.lg,
          }}>
            <Text style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold as any,
              color: colors.textPrimary,
              marginBottom: spacing.xs,
            }}>
              Welcome back
            </Text>
            <Text style={{
              fontSize: fontSize.sm,
              color: colors.textMuted,
              marginBottom: spacing.xl,
            }}>
              Sign in to your account
            </Text>

            <Input
              label="Mobile Number"
              placeholder="Enter your mobile number"
              value={mobile}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.mobile}
              leftIcon={<Smartphone size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Button
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </View>

          {/* Hint */}
          {/* <Text style={{
            textAlign: 'center',
            fontSize: fontSize.xs,
            color: colors.textMuted,
            marginTop: spacing.xl,
          }}>
            Demo: 9999999999 / admin123
          </Text> */}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
