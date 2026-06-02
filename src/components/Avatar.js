import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const PALETTES = [
  ['#FF6B00', '#ff9500'],
  ['#3b82f6', '#8b5cf6'],
  ['#22c55e', '#16a34a'],
  ['#8b5cf6', '#d946ef'],
  ['#14b8a6', '#0891b2'],
  ['#f59e0b', '#ef4444'],
];

function colorIndex(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % PALETTES.length;
}

export default function Avatar({name = '', size = 32, style}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const [a, b] = PALETTES[colorIndex(name)];
  const r = size / 2;
  return (
    <View style={[styles.av, {width: size, height: size, borderRadius: size * 0.3, background: undefined}, style,
      {backgroundColor: a}]}>
      <Text style={[styles.txt, {fontSize: size * 0.37}]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  av:  {alignItems: 'center', justifyContent: 'center'},
  txt: {color: '#fff', fontWeight: '700'},
});
