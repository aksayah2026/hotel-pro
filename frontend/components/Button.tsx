import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, style, textStyle, fullWidth = false,
}) => {
  const { theme } = useTheme();
  const { colors, radius, spacing, fontSize, fontWeight } = theme;

  const heights = { sm: 40, md: 48, lg: 56 };
  const fontSizes = { sm: fontSize.sm, md: fontSize.base, lg: fontSize.md };
  const paddings = { sm: spacing.md, md: spacing.base, lg: spacing.lg };

  const bgColors = {
    primary:   colors.primary,
    secondary: 'transparent',
    ghost:     'transparent',
    danger:    colors.error,
  };
  const textColors = {
    primary:   colors.textOnPrimary,
    secondary: colors.primary,
    ghost:     colors.textSecondary,
    danger:    colors.textOnPrimary,
  };
  const borderColors = {
    primary:   'transparent',
    secondary: colors.primary,
    ghost:     'transparent',
    danger:    'transparent',
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        {
          height: heights[size],
          backgroundColor: bgColors[variant],
          borderRadius: radius.lg,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: borderColors[variant],
          paddingHorizontal: paddings[size],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: isDisabled ? 0.5 : 1,
          ...(fullWidth && { width: '100%' }),
          ...theme.shadow.sm,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[{
            color: textColors[variant],
            fontSize: fontSizes[size],
            fontWeight: fontWeight.semiBold as any,
            letterSpacing: 0.2,
          }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
