/**
 * DIAGNOSTIC BUILD — minimal app to test if React Native loads at all.
 * If this opens: crash is in navigation/native modules. Add back components.
 * If this doesn't open: crash is at native/JNI level before JS runs.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <Text style={styles.logoTxt}>JD</Text>
      </View>
      <Text style={styles.title}>JD Admin</Text>
      <Text style={styles.sub}>If you can see this, the app works!</Text>
      <Text style={styles.note}>Full app coming next build.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    {flex: 1, backgroundColor: '#05060a', alignItems: 'center', justifyContent: 'center'},
  logo:    {width: 80, height: 80, borderRadius: 20, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center', marginBottom: 20},
  logoTxt: {fontSize: 34, fontWeight: '900', color: '#fff'},
  title:   {fontSize: 28, fontWeight: '800', color: '#eef0f8', marginBottom: 10},
  sub:     {fontSize: 16, color: '#22c55e', marginBottom: 8},
  note:    {fontSize: 13, color: '#8892a8'},
});
