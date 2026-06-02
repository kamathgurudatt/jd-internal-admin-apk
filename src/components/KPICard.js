import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

const COLOR_MAP = {
  orange: colors.jd,
  green:  colors.green,
  blue:   colors.blue,
  red:    colors.red,
  yellow: colors.yellow,
  white:  colors.text,
};

export default function KPICard({value, label, accent = 'white', style}) {
  const c = COLOR_MAP[accent] || colors.text;
  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, {color: c}]}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:  {flex: 1, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 10},
  value: {fontSize: 28, fontWeight: '800', lineHeight: 32},
  label: {fontSize: 9, color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3},
});
