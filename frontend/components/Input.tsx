import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: object;
}

export const Input: React.FC<InputProps> = ({
  label, error, hint, leftIcon, rightIcon,
  secureTextEntry, containerStyle, ...props
}) => {
  const { theme } = useTheme();
  const { colors, spacing, radius, fontSize, fontWeight } = theme;
  const [isFocused, setIsFocused]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const isEditable = props.editable !== false;
  const borderColor = error ? colors.error : isFocused ? colors.borderFocused : colors.border;
  const containerBg = isEditable ? colors.surface : '#F1F5F9';
  const textClr = isEditable ? colors.textPrimary : colors.textMuted;

  return (
    <View style={[{ marginBottom: spacing.base }, containerStyle]}>
      {label && (
        <Text style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semiBold as any,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
          letterSpacing: 0.1,
        }}>
          {label}
        </Text>
      )}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: containerBg,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: isEditable ? borderColor : colors.border,
        paddingHorizontal: spacing.md,
        height: 52,
        gap: spacing.sm,
      }}>
        {leftIcon && <View style={{ opacity: isEditable ? 0.6 : 0.4 }}>{leftIcon}</View>}
        <TextInput
          {...props}
          style={[{
            flex: 1,
            color: textClr,
            fontSize: fontSize.base,
            height: '100%',
          }, props.style]}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={colors.textMuted}
          onFocus={() => isEditable && setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
            {showPassword
              ? <EyeOff size={18} color={colors.textMuted} />
              : <Eye size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        )}
        {!isPassword && rightIcon && rightIcon}
      </View>
      {error && (
        <Text style={{
          fontSize: fontSize.xs,
          color: colors.error,
          marginTop: spacing.xs,
        }}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={{
          fontSize: fontSize.xs,
          color: colors.textMuted,
          marginTop: spacing.xs,
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
};
