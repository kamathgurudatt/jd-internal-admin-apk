import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AppBar from '../components/AppBar';
import OfflineBanner from '../components/OfflineBanner';
import ConfirmModal from '../components/ConfirmModal';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import useNetworkStatus from '../hooks/useNetworkStatus';

function elapsed(iso) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${secs % 60}s`;
}

export default function GlobalUnlockScreen({navigation}) {
  const online = useNetworkStatus();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);
  const [confirm,    setConfirm]    = useState(null);
  const [acting,     setActing]     = useState(false);
  const [elapsedStr, setElapsedStr] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!data?.enabled) return;
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue: 0.25, duration: 900, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 1,    duration: 900, useNativeDriver: true}),
    ])).start();
    const id = setInterval(() => setElapsedStr(elapsed(data.enabledAt)), 5000);
    setElapsedStr(elapsed(data.enabledAt));
    return () => clearInterval(id);
  }, [data?.enabled, data?.enabledAt, pulse]);

  const load = useCallback(async (isRef = false) => {
    if (isRef) setRefresh(true); else setLoading(true);
    try { const d = await api.get('/api/global-unlock'); setData(d); } catch {}
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleUnlock = useCallback(async (enable) => {
    setActing(true);
    try {
      await api.post('/api/global-unlock', {enabled: enable});
      await load();
    } catch {}
    finally { setActing(false); setConfirm(null); }
  }, [load]);

  const clearLog = useCallback(async () => {
    await api.delete('/api/unlock-log');
    await load();
    setConfirm(null);
  }, [load]);

  const renderLog = ({item}) => (
    <View style={styles.logRow}>
      <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
      <View style={styles.logMid}>
        <Text style={styles.logName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.logPage}>{item.page || '—'}</Text>
      </View>
      <View style={[styles.logBadge, item.type === 'registered' ? styles.logReg : styles.logUnk]}>
        <Text style={[styles.logBadgeTxt, {color: item.type === 'registered' ? colors.green : colors.yellow}]}>
          {item.type === 'registered' ? 'Reg' : 'Unk'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <AppBar title="Global Unlock" onSettings={() => navigation.navigate('Settings')} />
      {!online && <OfflineBanner />}
      {loading ? (
        <ActivityIndicator color={colors.jd} style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={data?.log || []}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderLog}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={colors.jd} />}
          ListHeaderComponent={(
            <>
              {/* Status card */}
              <View style={[styles.statusCard, data?.enabled ? styles.statusActive : styles.statusOff]}>
                <View style={styles.statusPill}>
                  {data?.enabled && <Animated.View style={[styles.statusDot, {opacity: pulse}]} />}
                  <Text style={[styles.statusLabel, {color: data?.enabled ? colors.red : colors.green}]}>
                    {data?.enabled ? 'ACTIVE' : 'LOCKED'}
                  </Text>
                </View>
                {data?.enabled && elapsedStr ? (
                  <Text style={styles.statusSub}>Active for {elapsedStr}</Text>
                ) : data?.lockedAt ? (
                  <Text style={styles.statusSub}>Locked at {new Date(data.lockedAt).toLocaleTimeString()}</Text>
                ) : null}

                {/* Big toggle */}
                <TouchableOpacity
                  style={[styles.bigToggle, data?.enabled ? styles.bigToggleOn : styles.bigToggleOff]}
                  disabled={acting}
                  onPress={() => {
                    if (data?.enabled) {
                      setConfirm({type: 'lock'});
                    } else {
                      setConfirm({type: 'unlock'});
                    }
                  }}>
                  <View style={[styles.bigKnob, data?.enabled ? styles.bigKnobOn : styles.bigKnobOff]} />
                </TouchableOpacity>
                <Text style={styles.toggleHint}>{data?.enabled ? 'Tap to lock' : 'Tap to unlock'}</Text>

                {data?.enabled && (
                  <TouchableOpacity
                    style={styles.lockNowBtn}
                    onPress={() => setConfirm({type: 'lock'})}
                    disabled={acting}>
                    <Text style={styles.lockNowTxt}>🔒 Lock Now</Text>
                  </TouchableOpacity>
                )}

                {data?.enabled && (
                  <Text style={styles.warning}>All IP access restrictions are currently bypassed</Text>
                )}
              </View>

              {/* Log header */}
              <View style={styles.logHeader}>
                <Text style={styles.logTitle}>Access Log ({data?.logCount || 0})</Text>
                <TouchableOpacity style={styles.clearBtn}
                  onPress={() => setConfirm({type: 'clear'})}>
                  <Text style={styles.clearBtnTxt}>Clear</Text>
                </TouchableOpacity>
              </View>
              {(!data?.log || data.log.length === 0) && (
                <Text style={styles.emptyLog}>No log entries</Text>
              )}
            </>
          )}
          contentContainerStyle={styles.content}
        />
      )}

      {/* Confirm modals */}
      <ConfirmModal
        visible={confirm?.type === 'unlock'}
        title="Enable Global Unlock?"
        message={"This will bypass ALL access restrictions for every IP on the network.\n\nAny registered or unregistered IP will be able to access any tool.\n\nThis should only be used temporarily during maintenance."}
        confirmLabel="Enable Global Unlock"
        confirmDanger
        onConfirm={() => toggleUnlock(true)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        visible={confirm?.type === 'lock'}
        title="Lock access control?"
        message="This will re-enable IP-based access restrictions immediately."
        confirmLabel="Lock Now"
        onConfirm={() => toggleUnlock(false)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        visible={confirm?.type === 'clear'}
        title="Clear access log?"
        message="All 90-day access log entries will be permanently deleted."
        confirmLabel="Clear Log"
        confirmDanger
        onConfirm={clearLog}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          {flex: 1, backgroundColor: colors.bg},
  content:       {padding: 12, gap: 10, paddingBottom: 20},
  statusCard:    {borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5},
  statusActive:  {backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.25)'},
  statusOff:     {backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)'},
  statusPill:    {flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6},
  statusDot:     {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red},
  statusLabel:   {fontSize: 18, fontWeight: '900', letterSpacing: 1},
  statusSub:     {fontSize: 11, color: colors.text2, marginBottom: 14},
  bigToggle:     {width: 72, height: 36, borderRadius: 18, marginVertical: 10, position: 'relative', justifyContent: 'center'},
  bigToggleOn:   {backgroundColor: colors.red},
  bigToggleOff:  {backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border2},
  bigKnob:       {width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', position: 'absolute'},
  bigKnobOn:     {right: 4},
  bigKnobOff:    {left: 4},
  toggleHint:    {fontSize: 11, color: colors.text2},
  lockNowBtn:    {marginTop: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 9},
  lockNowTxt:    {color: colors.red, fontSize: 13, fontWeight: '700'},
  warning:       {fontSize: 10, color: 'rgba(239,68,68,0.6)', textAlign: 'center', marginTop: 8},
  logHeader:     {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4},
  logTitle:      {fontSize: 12, fontWeight: '700', color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.5},
  clearBtn:      {backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4},
  clearBtnTxt:   {fontSize: 11, color: colors.red, fontWeight: '600'},
  emptyLog:      {fontSize: 12, color: colors.text2, textAlign: 'center', marginTop: 20},
  logRow:        {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: 8},
  logTime:       {fontSize: 10, color: colors.text2, fontFamily: 'monospace', width: 46},
  logMid:        {flex: 1},
  logName:       {fontSize: 11, color: colors.text, fontWeight: '600'},
  logPage:       {fontSize: 9, color: colors.text2},
  logBadge:      {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5},
  logReg:        {backgroundColor: 'rgba(34,197,94,0.12)'},
  logUnk:        {backgroundColor: 'rgba(245,158,11,0.12)'},
  logBadgeTxt:   {fontSize: 8, fontWeight: '700'},
});
