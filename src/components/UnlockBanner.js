import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors} from '../theme/colors';
import {api} from '../api/client';

export default function UnlockBanner({enabledAt, onLocked}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 0.3, duration: 800, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1,   duration: 800, useNativeDriver: true}),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    const fmt = () => {
      if (!enabledAt) return;
      const secs = Math.floor((Date.now() - new Date(enabledAt).getTime()) / 1000);
      const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    fmt();
    const id = setInterval(fmt, 30000);
    return () => clearInterval(id);
  }, [enabledAt]);

  const lockNow = async () => {
    await api.post('/api/global-unlock', {enabled: false});
    onLocked?.();
  };

  return (
    <View style={styles.banner}>
      <Animated.View style={[styles.dot, {opacity: pulse}]} />
      <Text style={styles.txt}>GLOBAL UNLOCK ACTIVE{elapsed ? ` — ${elapsed}` : ''}</Text>
      <TouchableOpacity onPress={lockNow} style={styles.btn}>
        <Text style={styles.btnTxt}>Lock Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, marginHorizontal: 12, marginTop: 8, marginBottom: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8},
  dot:    {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red},
  txt:    {flex: 1, fontSize: 11, fontWeight: '700', color: colors.red},
  btn:    {backgroundColor: 'rgba(239,68,68,0.18)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4},
  btnTxt: {fontSize: 9, fontWeight: '700', color: colors.red},
});
