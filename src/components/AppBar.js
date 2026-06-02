import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';

export default function AppBar({title, subtitle, onSettings, onBack, right}) {
  const {top} = useSafeAreaInsets();
  return (
    <View style={[styles.bar, {paddingTop: top + 8}]}>
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rightRow}>
        {right || null}
        {onSettings && (
          <TouchableOpacity onPress={onSettings} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconTxt}>⚙</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:      {backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between'},
  left:     {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  backBtn:  {marginRight: 4},
  backArrow:{fontSize: 20, color: colors.text2},
  title:    {fontSize: 16, fontWeight: '700', color: colors.text},
  sub:      {fontSize: 10, color: colors.text2, marginTop: 1},
  rightRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  iconBtn:  {width: 32, height: 32, borderRadius: 8, backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center'},
  iconTxt:  {fontSize: 15},
});
