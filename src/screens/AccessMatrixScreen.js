import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import ModuleChip from '../components/ModuleChip';
import ConfirmModal from '../components/ConfirmModal';
import OfflineBanner from '../components/OfflineBanner';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import useNetworkStatus from '../hooks/useNetworkStatus';

const MODULES = ['ai_qc_dashboard','llm_qc_dashboard','okr_tracker','jd_toolkit','searchmis_dashboard','cron_monitor','jira_tracker'];

function accessBadge(ips, accessMap, admin) {
  if (admin) return {type: 'admin', label: 'Admin'};
  if (!ips || ips.length === 0) return {type: 'restricted', label: 'No IPs'};
  const grants = ips.reduce((acc, ip) => {
    MODULES.forEach(m => { if ((accessMap[ip] || {})[m]) acc[m] = true; });
    return acc;
  }, {});
  const count = Object.keys(grants).length;
  if (count === 0)               return {type: 'restricted', label: 'Restricted'};
  if (count === MODULES.length)  return {type: 'full',       label: 'Full Access'};
  return {type: 'partial', label: 'Partial'};
}

const SNACK_MS = 3000;

export default function AccessMatrixScreen({navigation}) {
  const online   = useNetworkStatus();
  const [employees, setEmployees] = useState([]);
  const [accessMap, setAccessMap] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');
  const [expanded,  setExpanded]  = useState({});
  const [confirm,   setConfirm]   = useState(null);
  const [snack,     setSnack]     = useState(null);
  const snackAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, usrData, accData] = await Promise.all([
        api.get('/api/employees'),
        api.get('/api/users'),
        api.get('/api/access'),
      ]);
      const emps = Object.entries(empData.employees || {}).map(([id, e]) => ({...e, empId: id}));
      const usrMap = usrData || {};
      const ipsByEmp = {};
      Object.entries(usrMap).forEach(([ip, u]) => {
        if (u.empId) { (ipsByEmp[u.empId] = ipsByEmp[u.empId] || []).push({ip, ...u}); }
      });
      setEmployees(emps.map(e => ({...e, ips: (ipsByEmp[e.empId] || []).map(i => i.ip), admin: (ipsByEmp[e.empId] || []).some(i => i.admin)})));
      setAccessMap(accData || {});
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showSnack = useCallback((msg) => {
    setSnack(msg);
    Animated.sequence([
      Animated.timing(snackAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
      Animated.delay(SNACK_MS),
      Animated.timing(snackAnim, {toValue: 0, duration: 200, useNativeDriver: true}),
    ]).start(() => setSnack(null));
  }, [snackAnim]);

  const toggleModule = useCallback(async (emp, moduleId, ip, currentGrant) => {
    const newGrant = !currentGrant;
    try {
      await api.post('/api/access', {ip, module: moduleId, granted: newGrant});
      setAccessMap(prev => ({
        ...prev,
        [ip]: {...(prev[ip] || {}), [moduleId]: newGrant},
      }));
      showSnack(`${moduleId.replace(/_/g,' ')} ${newGrant ? 'granted' : 'revoked'} for ${emp.name}`);
    } catch {
      showSnack('Failed — check connection');
    }
  }, [showSnack]);

  const grantAll = useCallback(async (emp) => {
    for (const ip of emp.ips) {
      for (const m of MODULES) {
        await api.post('/api/access', {ip, module: m, granted: true}).catch(() => {});
      }
    }
    await load();
    showSnack(`All access granted for ${emp.name}`);
  }, [load, showSnack]);

  const revokeAll = useCallback(async (emp) => {
    for (const ip of emp.ips) {
      await api.delete(`/api/access/${ip}`).catch(() => {});
    }
    await load();
    showSnack(`All access revoked for ${emp.name}`);
  }, [load, showSnack]);

  const filtered = employees.filter(e =>
    !query || e.name?.toLowerCase().includes(query.toLowerCase()) || e.empId?.toLowerCase().includes(query.toLowerCase())
  );

  const renderItem = useCallback(({item: emp}) => {
    const badge    = accessBadge(emp.ips, accessMap, emp.admin);
    const isOpen   = !!expanded[emp.empId];
    const firstIp  = emp.ips?.[0];

    return (
      <TouchableOpacity
        style={styles.empCard}
        activeOpacity={0.8}
        onPress={() => setExpanded(prev => ({...prev, [emp.empId]: !prev[emp.empId]}))}>
        <View style={styles.empRow}>
          <Avatar name={emp.name || emp.empId} size={32} />
          <View style={styles.empInfo}>
            <Text style={styles.empName}>{emp.name || emp.empId}</Text>
            <Text style={styles.empSub}>{emp.empId}{firstIp ? ` · ${firstIp}` : ' · No IPs'}</Text>
          </View>
          <Badge type={badge.type} label={badge.label} />
        </View>

        {isOpen && !emp.admin && (
          <>
            {emp.ips.length === 0 ? (
              <Text style={styles.noIpNote}>No IPs registered — add IPs in Team tab first</Text>
            ) : (
              <>
                {emp.ips.map(ip => (
                  <View key={ip} style={styles.ipSection}>
                    <Text style={styles.ipLabel}>{ip}</Text>
                    <View style={styles.chipsRow}>
                      {MODULES.map(m => (
                        <ModuleChip
                          key={m}
                          moduleId={m}
                          granted={!!(accessMap[ip] || {})[m]}
                          onPress={() => toggleModule(emp, m, ip, !!(accessMap[ip] || {})[m])}
                        />
                      ))}
                    </View>
                  </View>
                ))}
                <View style={styles.bulkRow}>
                  <TouchableOpacity style={styles.revokeBtn} onPress={() =>
                    setConfirm({title: `Revoke all for ${emp.name}?`, action: () => revokeAll(emp)})}>
                    <Text style={styles.revokeBtnTxt}>Revoke All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.grantBtn} onPress={() => grantAll(emp)}>
                    <Text style={styles.grantBtnTxt}>Grant All</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  }, [accessMap, expanded, toggleModule, grantAll, revokeAll]);

  return (
    <View style={styles.root}>
      <AppBar title="Access Matrix" onSettings={() => navigation.navigate('Settings')} />
      {!online && <OfflineBanner />}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search employees…"
          placeholderTextColor={colors.text2}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.jd} style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.empId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        confirmLabel="Revoke All"
        confirmDanger
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
      {snack && (
        <Animated.View style={[styles.snack, {opacity: snackAnim}]}>
          <Text style={styles.snackTxt}>{snack}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       {flex: 1, backgroundColor: colors.bg},
  searchBox:  {padding: 12, paddingBottom: 6},
  search:     {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.text},
  list:       {padding: 12, gap: 8},
  empCard:    {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12},
  empRow:     {flexDirection: 'row', alignItems: 'center', gap: 10},
  empInfo:    {flex: 1},
  empName:    {fontSize: 13, fontWeight: '700', color: colors.text},
  empSub:     {fontSize: 10, color: colors.text2, marginTop: 1},
  noIpNote:   {fontSize: 11, color: colors.text2, marginTop: 8, fontStyle: 'italic'},
  ipSection:  {marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border},
  ipLabel:    {fontSize: 9, color: colors.text2, fontFamily: 'monospace', marginBottom: 5},
  chipsRow:   {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  bulkRow:    {flexDirection: 'row', gap: 8, marginTop: 10},
  grantBtn:   {flex: 1, backgroundColor: colors.jd, borderRadius: 7, paddingVertical: 7, alignItems: 'center'},
  grantBtnTxt:{color: '#fff', fontSize: 12, fontWeight: '700'},
  revokeBtn:  {flex: 1, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 7, paddingVertical: 7, alignItems: 'center'},
  revokeBtnTxt:{color: colors.text2, fontSize: 12, fontWeight: '600'},
  snack:      {position: 'absolute', bottom: 80, left: 20, right: 20, backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 10, padding: 12},
  snackTxt:   {color: colors.text, fontSize: 12, textAlign: 'center'},
});
