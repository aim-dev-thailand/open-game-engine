import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';

type ItemType = {
  id?: number;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
  stackable: boolean;
  max_stack?: number;
  stats?: {
    attack?: number;
    defense?: number;
    hp?: number;
    mp?: number;
  };
};

type EditItemModalProps = {
  visible: boolean;
  onClose: () => void;
  item?: ItemType;
  onSave: (item: ItemType) => void;
  mode: 'create' | 'edit';
};

export default function EditItemModal({ visible, onClose, item, onSave, mode }: EditItemModalProps) {
  const [formData, setFormData] = useState<ItemType>({
    name: '',
    description: '',
    type: 'weapon',
    rarity: 'common',
    value: 0,
    stackable: false,
    max_stack: 1,
    stats: {},
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'weapon',
        rarity: 'common',
        value: 0,
        stackable: false,
        max_stack: 1,
        stats: {},
      });
    }
  }, [item, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อไอเทม');
      return;
    }
    onSave(formData);
    onClose();
  };

  const updateStats = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: value || 0 },
    }));
  };

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      common: '#9ca3af',
      uncommon: '#22c55e',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
    };
    return colors[rarity] || '#9ca3af';
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      weapon: 'อาวุธ',
      armor: 'เกราะ',
      consumable: 'ของใช้',
      material: 'วัตถุดิบ',
    };
    return labels[type] || type;
  };

  const getRarityLabel = (rarity: string) => {
    const labels: { [key: string]: string } = {
      common: 'ธรรมดา',
      uncommon: 'ไม่ธรรมดา',
      rare: 'หายาก',
      epic: 'มหาศาล',
      legendary: 'ตำนาน',
    };
    return labels[rarity] || rarity;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'create' ? 'สร้างไอเทมใหม่' : 'แก้ไขไอเทม'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>ชื่อ *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="กรอกชื่อไอเทม"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>คำอธิบาย</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="กรอกคำอธิบายไอเทม"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ประเภท</Text>
              <View style={styles.typeContainer}>
                {(['weapon', 'armor', 'consumable', 'material'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.type === type && styles.typeButtonTextActive,
                    ]}>
                      {getTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ความหายาก</Text>
              <View style={styles.rarityContainer}>
                {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
                  <TouchableOpacity
                    key={rarity}
                    style={[
                      styles.rarityButton,
                      { borderColor: getRarityColor(rarity) },
                      formData.rarity === rarity && { backgroundColor: getRarityColor(rarity) },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, rarity }))}
                  >
                    <Text style={[
                      styles.rarityButtonText,
                      formData.rarity === rarity && styles.rarityButtonTextActive,
                    ]}>
                      {getRarityLabel(rarity)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>มูลค่า</Text>
              <TextInput
                style={styles.input}
                value={formData.value.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, value: parseInt(text) || 0 }))}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>สามารถซ้อนกันได้</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.stackable && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, stackable: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.stackable && styles.switchButtonTextActive]}>ไม่ได้</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.stackable && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, stackable: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.stackable && styles.switchButtonTextActive]}>ได้</Text>
                </TouchableOpacity>
              </View>
            </View>

            {formData.stackable && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>จำนวนสูงสุด</Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_stack?.toString() || '1'}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, max_stack: parseInt(text) || 1 }))}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ค่าสถานะ</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>โจมตี</Text>
              <TextInput
                style={styles.input}
                value={formData.stats?.attack?.toString() || '0'}
                onChangeText={(text) => updateStats('attack', parseInt(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ป้องกัน</Text>
              <TextInput
                style={styles.input}
                value={formData.stats?.defense?.toString() || '0'}
                onChangeText={(text) => updateStats('defense', parseInt(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>เพิ่ม HP</Text>
              <TextInput
                style={styles.input}
                value={formData.stats?.hp?.toString() || '0'}
                onChangeText={(text) => updateStats('hp', parseInt(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>เพิ่ม MP</Text>
              <TextInput
                style={styles.input}
                value={formData.stats?.mp?.toString() || '0'}
                onChangeText={(text) => updateStats('mp', parseInt(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>บันทึกไอเทม</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a4e',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    color: '#a0a0a0',
    fontSize: 14,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  rarityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rarityButton: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 2,
  },
  rarityButtonText: {
    color: '#a0a0a0',
    fontSize: 12,
    textAlign: 'center',
  },
  rarityButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  switchButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  switchButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  switchButtonText: {
    color: '#a0a0a0',
    fontSize: 16,
    textAlign: 'center',
  },
  switchButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
