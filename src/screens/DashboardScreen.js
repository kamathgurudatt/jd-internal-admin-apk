import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import AppBar from '../components/AppBar';
import KPICard from '../components/KPICard';
import OfflineBanner from '../components/OfflineBanner';
import UnlockBanner from '../components/UnlockBanner';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import useNetworkStatus from '../hooks/useNetworkStatus';

const MODULES = [
  {id: 'ai_qc_dashboard',     label: 'AI QC Dashboard'},
  {id: 'llm_qc_dashboard',    label: 'LLM QC Dashboard'},
  {id: 'okr_tracker',         label: 'OKR Tracker'},
  {id: 'jd_toolkit',          label: 'JD Toolkit'},
  {id: 'searchmis_dashboard', label: 'Search MIS'},
  {id: 'cron_monitor',        label: 'Cron Monitor'},
  {id: 'jira_tracker',        label: 'Jira Tracker'},
];

export default function DashboardScreen({navigation}) {
  const online  = useNetworkStatus();
  const [data,     setData]     = useState(null);
  const [unlock,   setUnlock]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      const [emp, usr, acc, ul] = await Promise.all([
        api.get('/api/employees'),
        api.get('/api/users'),
        api.get('/api/access'),
        api.get('/api/global-unlock'),
      ]);
      setData({emp, usr, acc});
      setUnlock(ul);
    } catch {}
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = React.useMemo(() => {
    if (!data) return {};
    const employees   = Object.values(data.emp?.employees || {});
    const ips         = Object.keys(data.usr || {});
    const accessMap   = data.acc || {};

    let full = 0, partial = 0, admin = 0, restricted = 0;
    ips.forEach(ip => {
      const u = (data.usr || {})[ip];
      if (u?.admin) { admin++; return; }
      const grants = accessMap[ip] || {};
      const granted = MODULES.filter(m => grants[m.id]).length;
      if (granted === 0)              restricted++;
      else if (granted === MODULES.length) full++;
      else                            partial++;
    });
    employees.forEach(e => {
      if (!e.ips?.length) restricted++;
    });

    const coverage = MODULES.map(m => {
      const pct = ips.length === 0 ? 0 :
        Math.round(ips.filter(ip => (accessMap[ip] || {})[m.id]).length / ips.length * 100);
      return {label: m.label, pct};
    });

    return {
      employees: employees.length,
      ips:       ips.length,
      modules:   MODULES.length,
      restricted,
      full, partial, admin,
      coverage,
    };
  }, [data]);

  return (
    <View style={styles.root}>
      <AppBar
        title="JD Admin"
        subtitle={`Gurudatt K. · Admin`}
        onSettings={() => navigation.navigate('Settings')}
        right={null}
      />
      {!online && <OfflineBanner />}
      {unlock?.enabled && (
        <UnlockBanner
          enabledAt={unlock.enabledAt}
          onLocked={() => setUnlock(u => ({...u, enabled: false}))}
        />
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={colors.jd} />}>

        {loading ? (
          <ActivityIndicator color={colors.jd} style={{marginTop: 40}} />
        ) : (
          <>
            {/* KPIs */}
            <View style={styles.kpiRow}>
              <KPICard value={kpis.employees} label="Employees" accent="orange" style={{flex:1}} />
              <KPICard value={kpis.ips}       label="Reg. IPs"  accent="blue"   style={{flex:1}} />
            </View>
            <View style={styles.kpiRow}>
              <KPICard value={kpis.modules}    label="Modules"    accent="green" style={{flex:1}} />
              <KPICard value={kpis.restricted} label="Restricted" accent="red"   style={{flex:1}} />
            </View>

            {/* Coverage */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Module Coverage</Text>
              {(kpis.coverage || []).map(c => (
                <View key={c.label} style={styles.progRow}>
                  <View style={styles.progTop}>
                    <Text style={styles.progLabel}>{c.label}</Text>
                    <Text style={styles.progPct}>{c.pct}%</Text>
                  </View>
                  <View style={styles.progBar}>
                    <View style={[styles.progFill, {width: `${c.pct}%`,
                      backgroundColor: c.pct === 100 ? colors.green : c.pct < 50 ? colors.yellow : colors.jd}]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Health */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Access Health</Text>
              <View style={styles.healthRow}>
                {[
                  {label: 'Full',       value: kpis.full,       color: colors.green},
                  {label: 'Partial',    value: kpis.partial,    color: colors.blue},
                  {label: 'Admin',      value: kpis.admin,      color: colors.jd},
                  {label: 'Restricted', value: kpis.restricted, color: colors.red},
                ].map(h => (
                  <View key={h.label} style={styles.healthCell}>
                    <Text style={[styles.healthVal, {color: h.color}]}>{h.value ?? 0}</Text>
                    <Text style={styles.healthLabel}>{h.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.lastUpdated}>Last updated: just now</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        {flex: 1, backgroundColor: colors.bg},
  scroll:      {flex: 1},
  content:     {padding: 12, gap: 8},
  kpiRow:      {flexDirection: 'row', gap: 8},
  card:        {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12},
  sectionTitle:{fontSize: 10, fontWeight: '700', color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10},
  progRow:     {marginBottom: 7},
  progTop:     {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  progLabel:   {fontSize: 11, color: colors.text},
  progPct:     {fontSize: 11, color: colors.text2},
  progBar:     {height: 4, backgroundColor: colors.s2, borderRadius: 2, overflow: 'hidden'},
  progFill:    {height: '100%', borderRadius: 2},
  healthRow:   {flexDirection: 'row', gap: 6},
  healthCell:  {flex: 1, backgroundColor: colors.s2, borderRadius: 8, padding: 8, alignItems: 'center'},
  healthVal:   {fontSize: 18, fontWeight: '800'},
  healthLabel: {fontSize: 8, color: colors.text2, textTransform: 'uppercase', marginTop: 2},
  lastUpdated: {fontSize: 10, color: colors.text2, textAlign: 'center'},
});
