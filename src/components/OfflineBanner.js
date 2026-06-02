import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

export default function OfflineBanner() {
  return (
    <View style={styles.bar}>
      <Text style={styles.dot}>●</Text>
      <Text style={styles.txt}>Offline · Showing cached data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {backgroundColor: 'rgba(239,68,68,0.12)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(239,68,68,0.3)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 6},
  dot: {color: colors.red, fontSize: 8},
  txt: {color: colors.red, fontSize: 11, fontWeight: '600'},
});
