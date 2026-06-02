import React, {useCallback, useContext, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthContext} from '../context/AuthContext';
import {BASE_URL, clearAll, getToken, saveToken, savePin} from '../api/client';
import {colors} from '../theme/colors';

const AUTO_LOCK_OPTIONS = [2, 5, 10, 15, 30];

export default function SettingsScreen({navigation}) {
  const {bottom} = useSafeAreaInsets();
  const {setIsAuthenticated, setIsConfigured} = useContext(AuthContext);
  const [token,   setToken]   = useState('');
  const [showTok, setShowTok] = useState(false);
  const [lockMin, setLockMin] = useState(5);
  const [pinMode, setPinMode] = useState(false);
  const [newPin,  setNewPin]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [flash,   setFlash]   = useState('');

  useEffect(() => {
    setToken(getToken() || '');
  }, []);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2500); };

  const saveTok = useCallback(async () => {
    if (!token) { showFlash('Token is required'); return; }
    setSaving(true);
    await saveToken(token);
    setSaving(false);
    showFlash('Token saved');
  }, [token]);

  const changePin = useCallback(async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { showFlash('PIN must be 4 digits'); return; }
    await savePin(newPin);
    setNewPin('');
    setPinMode(false);
    showFlash('PIN updated');
  }, [newPin]);

  const signOut = useCallback(async () => {
    await clearAll();
    setIsAuthenticated(false);
    setIsConfigured(false);
  }, [setIsAuthenticated, setIsConfigured]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: bottom + 24}]}>

        {flash ? <View style={styles.flashBanner}><Text style={styles.flashTxt}>{flash}</Text></View> : null}

        {/* Server (read-only URL + editable token) */}
        <Text style={styles.section}>Server</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Server URL</Text>
            <Text style={styles.rowVal} numberOfLines={1}>{BASE_URL}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Bearer Token</Text>
              <TextInput
                style={[styles.rowInput, {fontFamily: 'monospace', letterSpacing: showTok ? 0 : 2}]}
                value={token}
                onChangeText={setToken}
                secureTextEntry={!showTok}
                placeholderTextColor={colors.text2}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity onPress={() => setShowTok(s => !s)}>
              <Text style={styles.showBtn}>{showTok ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={saveTok} disabled={saving}>
          <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Update Token'}</Text>
        </TouchableOpacity>

        {/* Security */}
        <Text style={styles.section}>Security</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Auto-lock timer</Text>
            <View style={styles.segRow}>
              {AUTO_LOCK_OPTIONS.map(m => (
                <TouchableOpacity key={m} style={[styles.seg, lockMin === m && styles.segActive]} onPress={() => setLockMin(m)}>
                  <Text style={[styles.segTxt, {color: lockMin === m ? colors.jd : colors.text2}]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setPinMode(p => !p)}>
            <Text style={styles.rowLabel}>Change PIN</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          {pinMode && (
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.rowInput, {flex: 1, fontFamily: 'monospace', letterSpacing: 4}]}
                value={newPin}
                onChangeText={v => /^\d{0,4}$/.test(v) && setNewPin(v)}
                placeholder="New 4-digit PIN"
                placeholderTextColor={colors.text2}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              <TouchableOpacity style={styles.pinSaveBtn} onPress={changePin}>
                <Text style={styles.pinSaveTxt}>Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* About */}
        <Text style={styles.section}>About</Text>
        <View style={styles.group}>
          {[['App Version', '1.0.0'], ['Build Date', '2026-06-02'], ['User', 'Gurudatt Kamath']].map(([l, v], i, arr) => (
            <React.Fragment key={l}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{l}</Text>
                <Text style={styles.rowVal}>{v}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutTxt}>⎋  Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        {flex: 1, backgroundColor: colors.bg},
  header:      {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border},
  backBtn:     {marginRight: 10},
  backArrow:   {fontSize: 22, color: colors.text2},
  title:       {fontSize: 18, fontWeight: '700', color: colors.text},
  content:     {padding: 16, gap: 6},
  flashBanner: {backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 8, padding: 10, marginBottom: 4},
  flashTxt:    {color: colors.green, fontSize: 12, fontWeight: '600', textAlign: 'center'},
  section:     {fontSize: 10, fontWeight: '700', color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 10},
  group:       {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, overflow: 'hidden'},
  row:         {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10},
  rowLeft:     {flex: 1},
  rowLabel:    {fontSize: 13, color: colors.text, marginBottom: 2},
  rowInput:    {fontSize: 12, color: colors.text, backgroundColor: 'transparent', padding: 0},
  rowVal:      {fontSize: 11, color: colors.text2, maxWidth: 180},
  rowArrow:    {fontSize: 16, color: colors.text2},
  showBtn:     {fontSize: 12, color: colors.jd, fontWeight: '600'},
  divider:     {height: 0.5, backgroundColor: colors.border, marginHorizontal: 14},
  saveBtn:     {backgroundColor: colors.jd, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4},
  saveBtnTxt:  {color: '#fff', fontSize: 14, fontWeight: '700'},
  segRow:      {flexDirection: 'row', gap: 4},
  seg:         {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border},
  segActive:   {borderColor: colors.jd},
  segTxt:      {fontSize: 11, fontWeight: '600'},
  pinRow:      {flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10},
  pinSaveBtn:  {backgroundColor: colors.jd, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8},
  pinSaveTxt:  {color: '#fff', fontSize: 13, fontWeight: '700'},
  signOutBtn:  {backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12},
  signOutTxt:  {color: colors.red, fontSize: 15, fontWeight: '700'},
});
