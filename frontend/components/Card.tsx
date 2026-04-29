import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, padding, elevated = true }) => {
  const { theme } = useTheme();
  const { colors, radius, spacing } = theme;

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: padding ?? spacing.base,
          ...(elevated ? theme.shadow.md : {}),
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
};
