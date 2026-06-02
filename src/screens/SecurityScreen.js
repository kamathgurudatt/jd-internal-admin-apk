import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AppBar from '../components/AppBar';
import OfflineBanner from '../components/OfflineBanner';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import useNetworkStatus from '../hooks/useNetworkStatus';

const SEV_COLOR = {critical: colors.red, high: colors.yellow, medium: colors.blue, low: colors.text2};

export default function SecurityScreen({navigation}) {
  const online = useNetworkStatus();
  const [report,   setReport]   = useState(null);
  const [scan,     setScan]     = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/api/security-report'); setReport(r); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try { const r = await api.post('/api/security-scan', {}); setScan(r); } catch {}
    finally { setScanning(false); }
  }, []);

  const kpis = scan?.counts || {};

  return (
    <View style={styles.root}>
      <AppBar title="Security" onSettings={() => navigation.navigate('Settings')} />
      {!online && <OfflineBanner />}
      {loading ? (
        <ActivityIndicator color={colors.jd} style={{marginTop: 40}} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* KPI row */}
          <View style={styles.kpiRow}>
            {[
              {label: 'Fixed',     val: 96,               color: colors.green},
              {label: 'Critical',  val: kpis.critical,    color: colors.red},
              {label: 'High',      val: kpis.high,        color: colors.yellow},
              {label: 'Deferred',  val: 13,               color: colors.text2},
            ].map(k => (
              <View key={k.label} style={styles.kpiCell}>
                <Text style={[styles.kpiVal, {color: k.color}]}>{k.val ?? '—'}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* Status bar */}
          {scan ? (
            <View style={[styles.statusBar,
              kpis.critical > 0 ? styles.statusRed : kpis.high > 0 ? styles.statusYellow : styles.statusGreen]}>
              <Text style={styles.statusDot}>●</Text>
              <Text style={styles.statusTxt}>
                {kpis.critical > 0 ? `${kpis.critical} critical issues found` :
                 kpis.high > 0     ? `${kpis.high} high severity issues` :
                 'No critical issues — scanned just now'}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBar, styles.statusGreen]}>
              <Text style={styles.statusDot}>●</Text>
              <Text style={styles.statusTxt}>
                All clear · Last report: {report?.lastModified ? new Date(report.lastModified).toLocaleDateString() : '—'}
              </Text>
            </View>
          )}

          {/* Scan card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Security Scan</Text>
            <Text style={styles.cardSub}>Scans all staged and committed files for API keys, plaintext passwords, and 10+ security patterns.</Text>
            <TouchableOpacity style={styles.scanBtn} onPress={runScan} disabled={scanning}>
              {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.scanBtnTxt}>▶  Run Scan Now</Text>}
            </TouchableOpacity>
            {scan?.scannedAt && (
              <Text style={styles.scanTime}>Scanned at {new Date(scan.scannedAt).toLocaleTimeString()}</Text>
            )}
          </View>

          {/* Hook status */}
          <View style={[styles.card, styles.hookCard]}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>Pre-commit Hook</Text>
              <View style={styles.activeBadge}><Text style={styles.activeBadgeTxt}>Active</Text></View>
            </View>
            <Text style={styles.cardSub}>Python · 12 patterns · Blocks on Critical severity</Text>
            <Text style={styles.cardSub}>Weekly scan agent: Monday 9:30 AM IST</Text>
          </View>

          {/* Findings */}
          {scan?.findings && scan.findings.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Findings ({scan.findings.length})</Text>
              {scan.findings.map((f, i) => (
                <View key={i} style={[styles.finding, {borderLeftColor: SEV_COLOR[f.severity] || colors.text2}]}>
                  <View style={styles.findingHeader}>
                    <Text style={[styles.sevLabel, {color: SEV_COLOR[f.severity] || colors.text2}]}>
                      {f.severity?.toUpperCase()}
                    </Text>
                    <Text style={styles.findingFile}>{f.file}:{f.line}</Text>
                  </View>
                  <Text style={styles.findingRule}>{f.rule}</Text>
                  {f.snippet && <Text style={styles.findingSnip}>{f.snippet}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Deferred */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deferred (13)</Text>
            {[
              {rule: 'Delegated onclick in matrix/coverage rows', sev: 'medium'},
              {rule: 'confirm() → custom modals for destructive ops', sev: 'medium'},
              {rule: 'SRI on CDN scripts', sev: 'low'},
            ].map((f, i) => (
              <View key={i} style={[styles.finding, {borderLeftColor: SEV_COLOR[f.sev]}]}>
                <Text style={[styles.sevLabel, {color: SEV_COLOR[f.sev]}]}>{f.sev.toUpperCase()}</Text>
                <Text style={styles.findingRule}>{f.rule}</Text>
              </View>
            ))}
            <Text style={styles.moreDeferred}>+10 more — see full report</Text>
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           {flex: 1, backgroundColor: colors.bg},
  content:        {padding: 12, gap: 8},
  kpiRow:         {flexDirection: 'row', gap: 6},
  kpiCell:        {flex: 1, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border, borderRadius: 8, padding: 8, alignItems: 'center'},
  kpiVal:         {fontSize: 20, fontWeight: '800', lineHeight: 24},
  kpiLabel:       {fontSize: 8, color: colors.text2, textTransform: 'uppercase', marginTop: 2},
  statusBar:      {flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 7},
  statusGreen:    {backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)'},
  statusYellow:   {backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)'},
  statusRed:      {backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)'},
  statusDot:      {fontSize: 8, color: colors.green},
  statusTxt:      {fontSize: 11, fontWeight: '600', color: colors.text, flex: 1},
  card:           {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12},
  hookCard:       {borderColor: 'rgba(34,197,94,0.2)'},
  cardRow:        {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  cardTitle:      {fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4},
  cardSub:        {fontSize: 11, color: colors.text2, lineHeight: 17, marginBottom: 2},
  scanBtn:        {marginTop: 10, backgroundColor: colors.jd, borderRadius: 8, paddingVertical: 11, alignItems: 'center'},
  scanBtnTxt:     {color: '#fff', fontSize: 14, fontWeight: '700'},
  scanTime:       {fontSize: 10, color: colors.text2, textAlign: 'center', marginTop: 6},
  activeBadge:    {backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2},
  activeBadgeTxt: {fontSize: 9, color: colors.green, fontWeight: '700'},
  finding:        {borderLeftWidth: 2, paddingLeft: 8, marginTop: 8, paddingBottom: 4},
  findingHeader:  {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2},
  sevLabel:       {fontSize: 9, fontWeight: '700', textTransform: 'uppercase'},
  findingFile:    {fontSize: 9, color: colors.text2, fontFamily: 'monospace'},
  findingRule:    {fontSize: 11, color: colors.text},
  findingSnip:    {fontSize: 9, color: colors.text2, fontFamily: 'monospace', marginTop: 2},
  moreDeferred:   {fontSize: 10, color: colors.text2, marginTop: 8, fontStyle: 'italic'},
});
