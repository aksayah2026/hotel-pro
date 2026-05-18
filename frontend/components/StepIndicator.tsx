import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = ['Dates', 'Rooms', 'Details', 'Amount', 'Confirm'];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;

  return (
    <View style={{
      paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      {/* Dynamic Textual Progress Context Row */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.sm,
      }}>
        <Text style={{
          fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: colors.textSecondary
        }}>
          Current: <Text style={{ color: colors.textPrimary, fontWeight: fontWeight.bold as any }}>{STEPS[currentStep - 1]}</Text>
        </Text>
        <View style={{
          backgroundColor: colors.primaryLight,
          paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm,
        }}>
          <Text style={{
            fontSize: 10, fontWeight: fontWeight.bold as any, color: colors.primary
          }}>
            Step {currentStep} of {STEPS.length}
          </Text>
        </View>
      </View>

      {/* Stepper Visual Circles Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: circleBg,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold as any, color: circleTextColor }}>
                  {isPast ? '✓' : stepNum}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: textCol, marginLeft: 4, fontWeight: (isActive || isPast) ? fontWeight.semiBold as any : fontWeight.regular as any }}>
                {stepName}
              </Text>
              {index < STEPS.length - 1 && (
                <View style={{ flex: 1, height: 1, backgroundColor: isPast ? colors.primaryLight : colors.divider, marginHorizontal: 4 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
