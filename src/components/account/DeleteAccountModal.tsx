import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  labels: { title: string; body: string; cancel: string; confirm: string };
}

const DeleteAccountModal = ({ visible, onClose, onConfirm, deleting, labels }: DeleteAccountModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Animated.View entering={FadeInDown.duration(220)} style={s.card}>
        <View style={s.iconWrap}>
          <MaterialIcons name="delete-forever" size={30} color={colors.error} />
        </View>
        <Text style={s.title}>{labels.title}</Text>
        <Text style={s.body}>{labels.body}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>{labels.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={onConfirm} disabled={deleting} activeOpacity={0.85}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.deleteTxt}>{labels.confirm}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconWrap:  { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:     { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  body:      { fontSize: 14, color: colors.inkMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actions:   { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default DeleteAccountModal;
