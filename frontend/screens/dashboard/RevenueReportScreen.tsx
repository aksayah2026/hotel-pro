import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Filter, RefreshCcw, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { dashboardService } from '../../services/dashboardService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const MONTHS = [
  { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
  { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
  { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
  { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' }
];

const YEARS = [2024, 2025, 2026, 2027];

export default function RevenueReportScreen() {
  const { theme } = useTheme();
  const { colors, spacing, fontSize, fontWeight, radius } = theme;
  const navigation = useNavigation<any>();

  const [type, setType] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [data, setData] = useState<any>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { type, year: selectedYear };
      if (type === 'month' && selectedMonth) {
        params.month = selectedMonth;
      }
      const res = await dashboardService.getRevenueReport(params);
      setData(res.data.data);
    } catch (err) {
      console.error('Report Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [type, selectedYear, selectedMonth]);

  const resetFilters = () => {
    setType('month');
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(null);
  };

  const renderMonthItem = ({ item }: { item: any }) => (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider
    }}>
      <Text style={{ fontSize: fontSize.base, color: colors.textPrimary, fontWeight: fontWeight.medium as any }}>
        {item.label}
      </Text>
      <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.primary }}>
        ₹{item.amount.toLocaleString('en-IN')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" />
      <Header title="Revenue Report" showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.lg }}>
        
        {/* Filter Selection */}
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
            <Filter size={18} color={colors.primary} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textPrimary }}>Report Filters</Text>
          </View>

          {/* Toggle Type */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, padding: 4 }}>
            {(['month', 'year'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { setType(t); setSelectedMonth(null); }}
                style={{
                  flex: 1, paddingVertical: 8, alignItems: 'center',
                  backgroundColor: type === t ? colors.surface : 'transparent',
                  borderRadius: radius.md,
                  ... (type === t ? theme.shadow.sm : {})
                }}>
                <Text style={{ 
                  fontSize: fontSize.sm, fontWeight: fontWeight.bold as any,
                  color: type === t ? colors.primary : colors.textMuted,
                  textTransform: 'capitalize'
                }}>{t}ly Report</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dropdowns logic */}
          <View style={{ gap: spacing.md }}>
             <View>
               <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4, marginLeft: 4 }}>Select Year</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {YEARS.map(y => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setSelectedYear(y)}
                      style={{
                        paddingHorizontal: spacing.lg, paddingVertical: 8,
                        backgroundColor: selectedYear === y ? colors.primary : colors.backgroundSecondary,
                        borderRadius: radius.full,
                        borderWidth: 1, borderColor: selectedYear === y ? colors.primary : colors.border
                      }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: selectedYear === y ? colors.textOnPrimary : colors.textSecondary }}>{y}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
             </View>

             {type === 'month' && (
               <View>
                 <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4, marginLeft: 4 }}>Select Month (Optional)</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => setSelectedMonth(null)}
                      style={{
                        paddingHorizontal: spacing.lg, paddingVertical: 8,
                        backgroundColor: selectedMonth === null ? colors.primary : colors.backgroundSecondary,
                        borderRadius: radius.full,
                        borderWidth: 1, borderColor: selectedMonth === null ? colors.primary : colors.border
                      }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: selectedMonth === null ? colors.textOnPrimary : colors.textSecondary }}>All Months</Text>
                    </TouchableOpacity>
                    {MONTHS.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setSelectedMonth(m.id)}
                        style={{
                          paddingHorizontal: spacing.lg, paddingVertical: 8,
                          backgroundColor: selectedMonth === m.id ? colors.primary : colors.backgroundSecondary,
                          borderRadius: radius.full,
                          borderWidth: 1, borderColor: selectedMonth === m.id ? colors.primary : colors.border
                        }}>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold as any, color: selectedMonth === m.id ? colors.textOnPrimary : colors.textSecondary }}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                 </ScrollView>
               </View>
             )}
          </View>

          <Button 
            label="Reset Filters" 
            variant="ghost" 
            size="sm" 
            onPress={resetFilters} 
            icon={<RefreshCcw size={14} color={colors.textMuted} />}
            textStyle={{ color: colors.textMuted }}
          />
        </Card>

        {/* Output Section */}
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.textSecondary }}>
              {type === 'month' ? (selectedMonth ? 'Specific Month' : 'Yearly Breakdown') : 'Lifetime Growth'}
            </Text>
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {loading ? null : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {type === 'month' && selectedMonth && data.amount !== undefined ? (
                <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                  <TrendingUp size={32} color={colors.success} />
                  <Text style={{ fontSize: fontSize.lg, color: colors.textMuted }}>{data.label}</Text>
                  <Text style={{ fontSize: fontSize['4xl'], fontWeight: fontWeight.extraBold as any, color: colors.textPrimary }}>
                    ₹{data.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={data}
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}
                  renderItem={({ item }) => (
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider
                    }}>
                      <Text style={{ fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.semiBold as any }}>
                        {item.label || item.year}
                      </Text>
                      <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.primary }}>
                        ₹{item.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted }}>No data found for this period</Text>
                    </View>
                  }
                />
              )}
            </Card>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
