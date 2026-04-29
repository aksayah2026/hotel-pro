import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = ['Dates', 'Rooms', 'Details', 'Amount', 'Confirm'];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight } = theme;

  return (
    <View style={{
      flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      {STEPS.map((stepName, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isPast = stepNum < currentStep;
        
        // Colors
        let circleBg = colors.backgroundSecondary;
        let circleTextColor = colors.textMuted;
        let textCol = colors.textMuted;

        if (isActive) {
          circleBg = colors.primary;
          circleTextColor = colors.textOnPrimary;
          textCol = colors.primary;
        } else if (isPast) {
          circleBg = colors.primaryLight;
          circleTextColor = colors.primary;
          textCol = colors.textPrimary;
        }

        return (
          <View key={stepName} style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: circleBg,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: circleTextColor }}>
                {isPast ? '✓' : stepNum}
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.xs, color: textCol, marginLeft: 4, fontWeight: (isActive || isPast) ? fontWeight.semiBold as any : fontWeight.regular as any }}>
              {stepName}
            </Text>
            {index < STEPS.length - 1 && (
              <View style={{ flex: 1, height: 1, backgroundColor: isPast ? colors.primaryLight : colors.divider, marginHorizontal: 4 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}
