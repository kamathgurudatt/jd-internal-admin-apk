import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

const MAP = {
  admin:      {bg: 'rgba(255,107,0,0.15)',   text: colors.jd},
  partial:    {bg: 'rgba(59,130,246,0.15)',  text: colors.blue},
  full:       {bg: 'rgba(34,197,94,0.15)',   text: colors.green},
  restricted: {bg: 'rgba(239,68,68,0.15)',   text: colors.red},
  active:     {bg: 'rgba(239,68,68,0.15)',   text: colors.red},
  ok:         {bg: 'rgba(34,197,94,0.12)',   text: colors.green},
  warn:       {bg: 'rgba(245,158,11,0.15)',  text: colors.yellow},
  info:       {bg: 'rgba(59,130,246,0.12)',  text: colors.blue},
};

export default function Badge({type = 'info', label, style}) {
  const c = MAP[type] || MAP.info;
  return (
    <View style={[styles.badge, {backgroundColor: c.bg}, style]}>
      <Text style={[styles.text, {color: c.text}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100},
  text:  {fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
});
