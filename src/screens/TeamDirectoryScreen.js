import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import OfflineBanner from '../components/OfflineBanner';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import useNetworkStatus from '../hooks/useNetworkStatus';

const BLANK_EMP = {empId:'', name:'', email:'', designation:'', section:'', department:'', branch:'', doj:'', reportingEmpId:'', admin: false};

export default function TeamDirectoryScreen({navigation}) {
  const online = useNetworkStatus();
  const [employees, setEmployees] = useState([]);
  const [usrMap,    setUsrMap]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');
  const [empModal,  setEmpModal]  = useState(null);   // null | 'add' | employee obj (edit)
  const [ipModal,   setIpModal]   = useState(null);   // null | {emp, mode:'add'|'del', ip:''}
  const [form,      setForm]      = useState(BLANK_EMP);
  const [ipInput,   setIpInput]   = useState('');
  const [ipNote,    setIpNote]    = useState('');
  const [confirm,   setConfirm]   = useState(null);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, usrData] = await Promise.all([api.get('/api/employees'), api.get('/api/users')]);
      const usrM = usrData || {};
      setUsrMap(usrM);
      const ipsByEmp = {};
      Object.entries(usrM).forEach(([ip, u]) => {
        if (u.empId) (ipsByEmp[u.empId] = ipsByEmp[u.empId] || []).push({ip, note: u.note});
      });
      const emps = Object.entries(empData.employees || {}).map(([id, e]) => ({...e, empId: id, ips: ipsByEmp[id] || []}));
      setEmployees(emps);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(BLANK_EMP); setEmpModal('add'); };
  const openEdit = (emp) => { setForm({...emp}); setEmpModal(emp); };

  const saveEmployee = useCallback(async () => {
    if (!form.empId || !form.name) return;
    setSaving(true);
    try {
      await api.post('/api/users', form);
      await load();
      setEmpModal(null);
    } catch {}
    finally { setSaving(false); }
  }, [form, load]);

  const deleteEmployee = useCallback(async (emp) => {
    await api.delete(`/api/users/${emp.empId}`);
    await load();
    setConfirm(null);
  }, [load]);

  const addIp = useCallback(async () => {
    if (!ipInput) return;
    setSaving(true);
    try {
      await api.post(`/api/users/${ipModal.emp.empId}/ips`, {ip: ipInput, note: ipNote});
      await load();
      setIpModal(null);
      setIpInput(''); setIpNote('');
    } catch {}
    finally { setSaving(false); }
  }, [ipInput, ipNote, ipModal, load]);

  const deleteIp = useCallback(async (empId, ip) => {
    await api.delete(`/api/users/${empId}/ips/${ip}`);
    await load();
    setConfirm(null);
  }, [load]);

  const filtered = employees.filter(e =>
    !query || e.name?.toLowerCase().includes(query.toLowerCase()) || e.empId?.toLowerCase().includes(query.toLowerCase())
  );

  const renderItem = useCallback(({item: emp}) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={emp.name || emp.empId} size={34} />
        <View style={styles.cardInfo}>
          <Text style={styles.empName}>{emp.name || emp.empId}</Text>
          <Text style={styles.empSub}>{emp.designation || '—'} · {emp.empId}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(emp)}>
            <Text style={styles.editBtnTxt}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={() => setConfirm({
            title: `Delete ${emp.name}?`,
            message: 'This removes the employee and all associated IP registrations.',
            action: () => deleteEmployee(emp),
          })}>
            <Text style={styles.delBtnTxt}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Branch</Text>
          <Text style={styles.metaVal}>{emp.branch || '—'}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>DOJ</Text>
          <Text style={styles.metaVal}>{emp.doj || '—'}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Reporting</Text>
          <Text style={styles.metaVal}>{emp.reportingEmpId || '—'}</Text>
        </View>
      </View>
      {/* IPs */}
      <View style={styles.ipRow}>
        {emp.ips.map(({ip, note}) => (
          <TouchableOpacity key={ip} style={styles.ipChip}
            onLongPress={() => setConfirm({title: `Remove IP ${ip}?`, action: () => deleteIp(emp.empId, ip)})}>
            <Text style={styles.ipChipTxt}>{ip}{note ? ` — ${note}` : ''}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addIpChip} onPress={() => setIpModal({emp, mode:'add'})}>
          <Text style={styles.addIpTxt}>+ Add IP</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [deleteEmployee, deleteIp]);

  return (
    <View style={styles.root}>
      <AppBar title="Team Directory" onSettings={() => navigation.navigate('Settings')} />
      {!online && <OfflineBanner />}
      <View style={styles.searchBox}>
        <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search employees…" placeholderTextColor={colors.text2} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.jd} style={{marginTop: 40}} />
      ) : (
        <FlatList data={filtered} keyExtractor={e => e.empId} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit Employee Modal */}
      <Modal visible={!!empModal} animationType="slide" onRequestClose={() => setEmpModal(null)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{empModal === 'add' ? 'Add Employee' : 'Edit Employee'}</Text>
            <TouchableOpacity onPress={() => setEmpModal(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll}>
            {[
              ['Emp ID',        'empId',         false],
              ['Full Name',     'name',          false],
              ['Email',         'email',         false],
              ['Designation',   'designation',   false],
              ['Section',       'section',       false],
              ['Department',    'department',    false],
              ['Branch',        'branch',        false],
              ['DOJ (DD MMM YYYY)', 'doj',       false],
              ['Reporting Emp ID', 'reportingEmpId', false],
            ].map(([label, key]) => (
              <View key={key} style={styles.formField}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput style={styles.formInput} value={form[key]} onChangeText={v => setForm(f => ({...f, [key]: v}))} placeholderTextColor={colors.text2} />
              </View>
            ))}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Admin Access</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, form.admin && styles.toggleBtnOn]}
                onPress={() => setForm(f => ({...f, admin: !f.admin}))}>
                <Text style={{color: form.admin ? colors.green : colors.text2, fontSize: 13, fontWeight: '600'}}>
                  {form.admin ? '✓ Admin' : 'Standard'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEmpModal(null)}>
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveEmployee} disabled={saving}>
              <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add IP Modal */}
      <Modal visible={!!ipModal} animationType="slide" transparent onRequestClose={() => setIpModal(null)}>
        <View style={styles.ipOverlay}>
          <View style={styles.ipSheet}>
            <Text style={styles.modalTitle}>Add IP for {ipModal?.emp?.name}</Text>
            <Text style={styles.formLabel}>IP Address</Text>
            <TextInput style={[styles.formInput, {marginBottom: 10}]} value={ipInput} onChangeText={setIpInput} placeholder="172.29.x.x" placeholderTextColor={colors.text2} keyboardType="numeric" />
            <Text style={styles.formLabel}>Location / Note (optional)</Text>
            <TextInput style={styles.formInput} value={ipNote} onChangeText={setIpNote} placeholder="e.g. Office, Home" placeholderTextColor={colors.text2} />
            <View style={[styles.modalFooter, {marginTop: 16}]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIpModal(null)}>
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addIp} disabled={saving}>
                <Text style={styles.saveBtnTxt}>Add IP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:         {flex: 1, backgroundColor: colors.bg},
  searchBox:    {padding: 12, paddingBottom: 6},
  search:       {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.text},
  list:         {padding: 12, gap: 10, paddingBottom: 80},
  card:         {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12},
  cardTop:      {flexDirection: 'row', alignItems: 'center', gap: 10},
  cardInfo:     {flex: 1},
  empName:      {fontSize: 13, fontWeight: '700', color: colors.text},
  empSub:       {fontSize: 10, color: colors.text2, marginTop: 1},
  cardActions:  {flexDirection: 'row', gap: 6},
  editBtn:      {width: 28, height: 28, borderRadius: 7, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center'},
  editBtnTxt:   {fontSize: 13},
  delBtn:       {width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center'},
  delBtnTxt:    {fontSize: 13},
  cardMeta:     {flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 8},
  metaCell:     {flex: 1},
  metaLabel:    {fontSize: 8, color: colors.text2, textTransform: 'uppercase', marginBottom: 2},
  metaVal:      {fontSize: 10, color: colors.text},
  ipRow:        {flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8},
  ipChip:       {backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3},
  ipChipTxt:    {fontSize: 9, color: colors.green, fontFamily: 'monospace'},
  addIpChip:    {backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3},
  addIpTxt:     {fontSize: 9, color: colors.jd, fontWeight: '600'},
  fab:          {position: 'absolute', bottom: 80, right: 16, width: 50, height: 50, borderRadius: 15, backgroundColor: colors.jd, alignItems: 'center', justifyContent: 'center', shadowColor: colors.jd, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8},
  fabTxt:       {fontSize: 26, color: '#fff', fontWeight: '300', marginTop: -2},
  modalRoot:    {flex: 1, backgroundColor: colors.bg},
  modalHeader:  {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border},
  modalTitle:   {fontSize: 16, fontWeight: '700', color: colors.text},
  modalClose:   {fontSize: 18, color: colors.text2, padding: 4},
  formScroll:   {padding: 16, gap: 10, paddingBottom: 40},
  formField:    {gap: 4},
  formLabel:    {fontSize: 10, color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.5},
  formInput:    {backgroundColor: colors.s1, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.text},
  toggleBtn:    {backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start'},
  toggleBtnOn:  {borderColor: 'rgba(34,197,94,0.4)'},
  modalFooter:  {flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 0.5, borderTopColor: colors.border},
  cancelBtn:    {flex: 1, backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2, borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  cancelBtnTxt: {color: colors.text2, fontSize: 14, fontWeight: '600'},
  saveBtn:      {flex: 1, backgroundColor: colors.jd, borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  saveBtnTxt:   {color: '#fff', fontSize: 14, fontWeight: '700'},
  ipOverlay:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  ipSheet:      {backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36},
});
