import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack = false, rightAction }) => {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight } = theme;
  const navigation = useNavigation();

  return (
    <View style={{
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      ...theme.shadow.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginRight: spacing.sm,
              padding: spacing.xs,
              borderRadius: theme.radius.sm,
              backgroundColor: colors.backgroundSecondary,
            }}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold as any,
            color: colors.textPrimary,
          }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{
              fontSize: fontSize.sm,
              color: colors.textMuted,
              marginTop: 2,
            }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && <View>{rightAction}</View>}
    </View>
  );
};
