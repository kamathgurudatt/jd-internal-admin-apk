import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {colors} from '../theme/colors';

const LABELS = {
  ai_qc_dashboard:      'AI QC',
  llm_qc_dashboard:     'LLM QC',
  okr_tracker:          'OKR',
  jd_toolkit:           'Toolkit',
  searchmis_dashboard:  'Search',
  cron_monitor:         'Cron',
  jira_tracker:         'Jira',
};

export default function ModuleChip({moduleId, granted, onPress}) {
  const label = LABELS[moduleId] || moduleId;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, granted ? styles.on : styles.off]}>
      <Text style={[styles.txt, {color: granted ? colors.green : colors.text2}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5},
  on:   {backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.25)'},
  off:  {backgroundColor: colors.s2, borderColor: colors.border},
  txt:  {fontSize: 9, fontWeight: '700', fontFamily: 'monospace'},
});
