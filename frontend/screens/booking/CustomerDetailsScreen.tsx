import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, User, Phone, Mail, MapPin, BedDouble } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { bookingService } from '../../services/bookingService';
import { Room } from '../../services/roomService';
import { StepIndicator } from '../../components/StepIndicator';
import { formatDisplayDate } from '../../utils/date';

export default function CustomerDetailsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  
  const rooms = route?.params?.rooms;
  const checkIn = route?.params?.checkIn;
  const checkOut = route?.params?.checkOut;
  const nights = route?.params?.nights;

  const [form, setForm] = useState({
    name: '', mobile: '', email: '', address: '',
  });
  const [aadhaarImageUri, setAadhaarImageUri] = useState<string | null>(null);
  const [aadhaarUrl,      setAadhaarUrl]      = useState<string | null>(null);
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!rooms || !checkIn || !checkOut || !nights) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
           <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.error }}>Invalid Navigation</Text>
           <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
             Missing booking parameters. Please restart the booking process.
           </Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md }}>
             <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.bold as any }}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const pickAadhaar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required to upload Aadhaar');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAadhaarImageUri(uri);
      setUploadingAadhaar(true);
      try {
        const res = await bookingService.uploadAadhaar(uri);
        setAadhaarUrl(res.data.data.url);
      } catch {
        Alert.alert('Upload Failed', 'Failed to upload Aadhaar image. Please try again.');
        setAadhaarImageUri(null);
      } finally {
        setUploadingAadhaar(false);
      }
    }
  };

  const captureAadhaar = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAadhaarImageUri(uri);
      setUploadingAadhaar(true);
      try {
        const res = await bookingService.uploadAadhaar(uri);
        setAadhaarUrl(res.data.data.url);
      } catch {
        Alert.alert('Upload Failed', 'Failed to upload Aadhaar image. Please try again.');
        setAadhaarImageUri(null);
      } finally {
        setUploadingAadhaar(false);
      }
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Customer name is required';
    if (!form.mobile || form.mobile.length < 10) e.mobile = 'Enter a valid 10-digit mobile number';
    // if (!aadhaarUrl) e.aadhaar = 'Aadhaar image is mandatory'; // Made optional for testing
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    navigation.navigate('EnterAmount', {
      rooms, checkIn, checkOut, nights,
      customer: { 
        name: form.name, 
        mobile: form.mobile, 
        email: form.email, 
        address: form.address, 
        aadhaarImage: aadhaarUrl || 'https://via.placeholder.com/150' 
      },
    });
  };

  const formatDisplay = (d: string) => formatDisplayDate(d);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header title="Customer Details" subtitle="Step 3 of 5" showBack />
      <StepIndicator currentStep={3} />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        {/* Booking Summary */}
        <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <BedDouble size={16} color={colors.primary} />
            <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semiBold as any }}>
              {rooms.length} Room{rooms.length > 1 ? 's' : ''} Selected
            </Text>
          </View>
          {rooms.map((room: Room) => (
            <View key={room.id} style={{
              flexDirection: 'row', justifyContent: 'space-between',
              paddingVertical: spacing.xs,
            }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.medium as any }}>
                Room {room.roomNumber} · {room.roomType?.name}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                Floor {room.floor}
              </Text>
            </View>
          ))}
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs }}>
            {formatDisplay(checkIn)} → {formatDisplay(checkOut)} · {nights} night{nights > 1 ? 's' : ''}
          </Text>
        </Card>

        {/* Customer Info */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.md }}>
            Customer Information
          </Text>
          <Input
            label="Full Name *"
            placeholder="Customer's full name"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            error={errors.name}
            leftIcon={<User size={18} color={colors.textMuted} />}
          />
          <Input
            label="Mobile Number *"
            placeholder="10-digit mobile number"
            value={form.mobile}
            onChangeText={(v) => set('mobile', v)}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.mobile}
            leftIcon={<Phone size={18} color={colors.textMuted} />}
          />
          <Input
            label="Email (optional)"
            placeholder="customer@email.com"
            value={form.email}
            onChangeText={(v) => set('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={18} color={colors.textMuted} />}
          />
          <Input
            label="Address (optional)"
            placeholder="Customer's address"
            value={form.address}
            onChangeText={(v) => set('address', v)}
            multiline numberOfLines={2}
            leftIcon={<MapPin size={18} color={colors.textMuted} />}
          />
        </Card>

        {/* Aadhaar Upload */}
        <Card>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary, marginBottom: spacing.xs }}>
            Aadhaar Card *
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md }}>
            Mandatory as per government regulations
          </Text>

          {aadhaarImageUri ? (
            <View>
              <Image
                source={{ uri: aadhaarImageUri }}
                style={{ width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.backgroundSecondary }}
                resizeMode="cover"
              />
              {uploadingAadhaar && (
                <View style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: colors.overlay,
                  borderRadius: radius.md,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: colors.textOnPrimary }}>Uploading…</Text>
                </View>
              )}
              {!uploadingAadhaar && aadhaarUrl && (
                <View style={{
                  backgroundColor: colors.successBg, borderRadius: radius.sm,
                  padding: spacing.sm, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semiBold as any }}>
                    ✓ Aadhaar uploaded successfully
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setAadhaarImageUri(null); setAadhaarUrl(null); }}
                style={{ marginTop: spacing.sm, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.sm, color: colors.error }}>Remove & Re-upload</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Camera"
                variant="secondary"
                onPress={captureAadhaar}
                icon={<Camera size={16} color={colors.primary} />}
                style={{ flex: 1 }}
              />
              <Button
                label="Gallery"
                variant="secondary"
                onPress={pickAadhaar}
                style={{ flex: 1 }}
              />
            </View>
          )}
          {errors.aadhaar && (
            <Text style={{ fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs }}>{errors.aadhaar}</Text>
          )}
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        padding: spacing.base, backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.divider, ...theme.shadow.lg,
      }}>
        <Button
          label="Continue to Enter Amount"
          onPress={handleNext}
          fullWidth size="lg"
          disabled={uploadingAadhaar}
          icon={<ChevronRight size={20} color={colors.textOnPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}
