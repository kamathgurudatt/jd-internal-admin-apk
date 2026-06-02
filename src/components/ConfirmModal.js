import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors} from '../theme/colors';

export default function ConfirmModal({visible, title, message, confirmLabel = 'Confirm', confirmDanger = false, onConfirm, onCancel}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.msg}>{message}</Text> : null}
          <View style={styles.btns}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, confirmDanger ? styles.danger : styles.primary]}
              onPress={onConfirm}>
              <Text style={[styles.confirmTxt, {color: confirmDanger ? colors.red : '#fff'}]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  sheet:      {backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderTopWidth: 0.5, borderColor: colors.border2},
  title:      {fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8},
  msg:        {fontSize: 13, color: colors.text2, lineHeight: 20, marginBottom: 20},
  btns:       {flexDirection: 'row', gap: 10},
  btn:        {flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center'},
  cancel:     {backgroundColor: colors.s2, borderWidth: 0.5, borderColor: colors.border2},
  cancelTxt:  {fontSize: 14, fontWeight: '600', color: colors.text2},
  primary:    {backgroundColor: colors.jd},
  danger:     {backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.3)'},
  confirmTxt: {fontSize: 14, fontWeight: '700'},
});
