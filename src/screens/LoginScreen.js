import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthContext} from '../context/AuthContext';
import {getBaseUrl, hasPinSet, saveCredentials, saveToken, savePin, verifyPin} from '../api/client';
import {colors} from '../theme/colors';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 30;

export default function LoginScreen() {
  const {top} = useSafeAreaInsets();
  const {setIsAuthenticated, isConfigured, setIsConfigured} = useContext(AuthContext);

  const [pin,        setPin]        = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [configMode, setConfigMode] = useState(!isConfigured);
  const [serverUrl,  setServerUrl]  = useState(getBaseUrl());
  const [token,      setToken]      = useState('');
  const [attempts,   setAttempts]   = useState(0);
  const [lockout,    setLockout]    = useState(0);
  const [errMsg,     setErrMsg]     = useState('');
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (lockout <= 0) return;
    const id = setTimeout(() => setLockout(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [lockout]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeX, {toValue:  8, duration: 60, useNativeDriver: true, easing: Easing.linear}),
      Animated.timing(shakeX, {toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear}),
      Animated.timing(shakeX, {toValue:  6, duration: 60, useNativeDriver: true, easing: Easing.linear}),
      Animated.timing(shakeX, {toValue:  0, duration: 60, useNativeDriver: true, easing: Easing.linear}),
    ]).start();
  }, [shakeX]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length !== 4 || lockout > 0) return;
    (async () => {
      if (settingPin) {
        if (confirmPin === '') {
          setConfirmPin(pin);
          setPin('');
          setErrMsg('Re-enter PIN to confirm');
        } else {
          if (pin === confirmPin) {
            await savePin(pin);
            setIsAuthenticated(true);
          } else {
            shake();
            setErrMsg('PINs do not match — try again');
            setPin(''); setConfirmPin(''); setSettingPin(false);
          }
        }
        return;
      }
      const ok = await verifyPin(pin);
      if (ok) {
        setAttempts(0);
        setIsAuthenticated(true);
      } else {
        shake();
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLockout(LOCKOUT_SECS);
          setAttempts(0);
          setErrMsg(`Too many attempts — wait ${LOCKOUT_SECS}s`);
        } else {
          setErrMsg(`Wrong PIN — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left`);
        }
        setPin('');
      }
    })();
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const pressKey = useCallback(k => {
    if (lockout > 0) return;
    if (k === 'del') { setPin(p => p.slice(0, -1)); return; }
    if (k === 'clr') { setPin(''); return; }
    setPin(p => p.length < 4 ? p + k : p);
    setErrMsg('');
  }, [lockout]);

  const saveConfig = useCallback(async () => {
    if (!serverUrl.startsWith('http')) { setErrMsg('URL must start with http/https'); return; }
    if (!token) { setErrMsg('Bearer token is required'); return; }
    await saveCredentials(serverUrl, token);
    setIsConfigured(true);
    setConfigMode(false);
    const pinSet = await hasPinSet();
    if (!pinSet) {
      setSettingPin(true);
      setErrMsg('Set a 4-digit PIN to protect the app');
    }
  }, [serverUrl, token, setIsConfigured]);

  const locked = lockout > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, {paddingTop: top + 16}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logo}><Text style={styles.logoTxt}>JD</Text></View>
        <Text style={styles.appName}>JD Admin</Text>
        <Text style={styles.appSub}>Internal Tools Manager</Text>
        <Text style={styles.serverUrl} numberOfLines={1}>{serverUrl}</Text>

        {/* Token + URL config (first launch) */}
        {configMode && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>⚙ FIRST-TIME SETUP</Text>
            </View>
            <Text style={styles.fieldLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://your-tunnel-url.com"
              placeholderTextColor={colors.text2}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={[styles.fieldLabel, {marginTop: 10}]}>Admin Bearer Token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste your admin bearer token"
              placeholderTextColor={colors.text2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errMsg ? <Text style={styles.errInline}>{errMsg}</Text> : null}
            <TouchableOpacity style={styles.saveBtn} onPress={saveConfig}>
              <Text style={styles.saveBtnTxt}>Save & Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PIN area */}
        {!configMode && (
          <>
            <Text style={styles.pinPrompt}>
              {settingPin && confirmPin === '' ? 'Set a new 4-digit PIN' :
               settingPin && confirmPin !== '' ? 'Confirm your PIN' :
               'Enter PIN to unlock'}
            </Text>

            <Animated.View style={[styles.dotsRow, {transform: [{translateX: shakeX}]}]}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[styles.dot,
                  i < pin.length && (locked ? styles.dotError : styles.dotFilled)]} />
              ))}
            </Animated.View>

            {errMsg ? (
              <Text style={styles.errMsg}>{locked ? `🔒 Locked — ${lockout}s` : errMsg}</Text>
            ) : null}

            <View style={styles.numpad}>
              {['1','2','3','4','5','6','7','8','9','clr','0','del'].map(k => (
                <TouchableOpacity
                  key={k} style={[styles.key, locked && styles.keyDisabled]}
                  onPress={() => pressKey(k)} disabled={locked}>
                  <Text style={[styles.keyTxt, (k==='clr'||k==='del') && styles.keySpecial]}>
                    {k === 'del' ? '⌫' : k === 'clr' ? 'CLR' : k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setConfigMode(true)}>
              <Text style={styles.configLink}>Update bearer token</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       {flex: 1, backgroundColor: colors.bg},
  scroll:     {alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40},
  logo:       {width: 60, height: 60, borderRadius: 17, backgroundColor: colors.jd, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  logoTxt:    {fontSize: 26, fontWeight: '900', color: '#fff'},
  appName:    {fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4},
  appSub:     {fontSize: 12, color: colors.text2, marginBottom: 4},
  serverUrl:  {fontSize: 10, color: colors.text2, fontFamily: 'monospace', marginBottom: 28, opacity: 0.6},
  card:       {width: '100%', backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 12, padding: 16, marginBottom: 24},
  cardHeader: {marginBottom: 12},
  cardTitle:  {fontSize: 10, fontWeight: '700', color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.6},
  fieldLabel: {fontSize: 10, color: colors.text2, marginBottom: 4},
  input:      {backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.text},
  errInline:  {fontSize: 11, color: colors.red, marginTop: 6},
  saveBtn:    {marginTop: 16, backgroundColor: colors.jd, borderRadius: 8, paddingVertical: 11, alignItems: 'center'},
  saveBtnTxt: {color: '#fff', fontSize: 14, fontWeight: '700'},
  pinPrompt:  {fontSize: 13, color: colors.text2, marginBottom: 20},
  dotsRow:    {flexDirection: 'row', gap: 18, marginBottom: 12},
  dot:        {width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.text2},
  dotFilled:  {backgroundColor: colors.jd, borderColor: colors.jd},
  dotError:   {backgroundColor: colors.red, borderColor: colors.red},
  errMsg:     {fontSize: 12, color: colors.red, marginBottom: 16, textAlign: 'center'},
  numpad:     {width: '80%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16},
  key:        {width: '28%', aspectRatio: 1.6, backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  keyDisabled:{opacity: 0.35},
  keyTxt:     {fontSize: 20, fontWeight: '500', color: colors.text},
  keySpecial: {fontSize: 13, fontWeight: '700', color: colors.jd},
  bioBtn:     {width: '80%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 10, paddingVertical: 11, marginBottom: 12},
  bioBtnTxt:  {fontSize: 13, color: colors.text2, fontWeight: '600'},
  configLink: {fontSize: 11, color: colors.text2, textDecorationLine: 'underline', marginTop: 8},
});
