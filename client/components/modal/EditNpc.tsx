import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';

type DialogueType = {
  id?: number;
  text: string;
  condition?: string;
  action?: string;
};

type NpcType = {
  id?: number;
  name: string;
  description: string;
  sprite_id: string;
  level: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  move_speed: number;
  is_hostile: boolean;
  can_trade: boolean;
  can_quest: boolean;
  dialogue: DialogueType[];
  shop_items?: number[];
  quests?: number[];
  position: { x: number; y: number };
  map_id?: number;
};

type EditNpcModalProps = {
  visible: boolean;
  onClose: () => void;
  npc?: NpcType;
  onSave: (npc: NpcType) => void;
  mode: 'create' | 'edit';
};

export default function EditNpcModal({ visible, onClose, npc, onSave, mode }: EditNpcModalProps) {
  const [formData, setFormData] = useState<NpcType>({
    name: '',
    description: '',
    sprite_id: '',
    level: 1,
    hp: 100,
    max_hp: 100,
    attack: 10,
    defense: 5,
    move_speed: 1.0,
    is_hostile: false,
    can_trade: false,
    can_quest: false,
    dialogue: [],
    shop_items: [],
    quests: [],
    position: { x: 0, y: 0 },
  });

  useEffect(() => {
    if (npc) {
      setFormData(npc);
    } else {
      setFormData({
        name: '',
        description: '',
        sprite_id: '',
        level: 1,
        hp: 100,
        max_hp: 100,
        attack: 10,
        defense: 5,
        move_speed: 1.0,
        is_hostile: false,
        can_trade: false,
        can_quest: false,
        dialogue: [],
        shop_items: [],
        quests: [],
        position: { x: 0, y: 0 },
      });
    }
  }, [npc, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter NPC name');
      return;
    }
    onSave(formData);
    onClose();
  };

  const addDialogue = () => {
    const newDialogue: DialogueType = {
      text: '',
      condition: '',
      action: '',
    };
    setFormData(prev => ({
      ...prev,
      dialogue: [...prev.dialogue, newDialogue],
    }));
  };

  const updateDialogue = (index: number, field: keyof DialogueType, value: string) => {
    setFormData(prev => ({
      ...prev,
      dialogue: prev.dialogue.map((d, i) => {
        if (i === index) {
          return { ...d, [field]: value };
        }
        return d;
      }),
    }));
  };

  const removeDialogue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dialogue: prev.dialogue.filter((_, i) => i !== index),
    }));
  };

  const addShopItem = () => {
    setFormData(prev => ({
      ...prev,
      shop_items: [...(prev.shop_items || []), 0],
    }));
  };

  const updateShopItem = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      shop_items: prev.shop_items?.map((item, i) => i === index ? value : item) || [],
    }));
  };

  const removeShopItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shop_items: prev.shop_items?.filter((_, i) => i !== index) || [],
    }));
  };

  const addQuest = () => {
    setFormData(prev => ({
      ...prev,
      quests: [...(prev.quests || []), 0],
    }));
  };

  const updateQuest = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      quests: prev.quests?.map((quest, i) => i === index ? value : quest) || [],
    }));
  };

  const removeQuest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quests: prev.quests?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'create' ? 'Create New NPC' : 'Edit NPC'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter NPC name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter NPC description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sprite ID</Text>
              <TextInput
                style={styles.input}
                value={formData.sprite_id}
                onChangeText={(text) => setFormData(prev => ({ ...prev, sprite_id: text }))}
                placeholder="Enter sprite ID"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Level</Text>
                <TextInput
                  style={styles.input}
                  value={formData.level.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, level: parseInt(text) || 1 }))}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Move Speed</Text>
                <TextInput
                  style={styles.input}
                  value={formData.move_speed.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, move_speed: parseFloat(text) || 1.0 }))}
                  placeholder="1.0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stats</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>HP</Text>
                <TextInput
                  style={styles.input}
                  value={formData.hp.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, hp: parseInt(text) || 100, max_hp: parseInt(text) || 100 }))}
                  placeholder="100"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max HP</Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_hp.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, max_hp: parseInt(text) || 100 }))}
                  placeholder="100"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Attack</Text>
                <TextInput
                  style={styles.input}
                  value={formData.attack.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, attack: parseInt(text) || 10 }))}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Defense</Text>
                <TextInput
                  style={styles.input}
                  value={formData.defense.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, defense: parseInt(text) || 5 }))}
                  placeholder="5"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Behavior</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hostile</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.is_hostile && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, is_hostile: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.is_hostile && styles.switchButtonTextActive]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.is_hostile && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, is_hostile: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.is_hostile && styles.switchButtonTextActive]}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Can Trade</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.can_trade && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_trade: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.can_trade && styles.switchButtonTextActive]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.can_trade && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_trade: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.can_trade && styles.switchButtonTextActive]}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Can Give Quests</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.can_quest && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_quest: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.can_quest && styles.switchButtonTextActive]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.can_quest && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_quest: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.can_quest && styles.switchButtonTextActive]}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Position</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>X Position</Text>
                <TextInput
                  style={styles.input}
                  value={formData.position.x.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, position: { ...prev.position, x: parseInt(text) || 0 } }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Y Position</Text>
                <TextInput
                  style={styles.input}
                  value={formData.position.y.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, position: { ...prev.position, y: parseInt(text) || 0 } }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Map ID</Text>
              <TextInput
                style={styles.input}
                value={formData.map_id?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, map_id: parseInt(text) || undefined }))}
                placeholder="Enter map ID"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dialogue</Text>
            </View>

            {formData.dialogue.map((dialogue, index) => (
              <View key={index} style={styles.dialogueItem}>
                <Text style={styles.dialogueLabel}>Dialogue {index + 1}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={dialogue.text}
                  onChangeText={(text) => updateDialogue(index, 'text', text)}
                  placeholder="Enter dialogue text"
                  multiline
                  numberOfLines={2}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfWidth]}
                    value={dialogue.condition || ''}
                    onChangeText={(text) => updateDialogue(index, 'condition', text)}
                    placeholder="Condition"
                  />
                  <TextInput
                    style={[styles.input, styles.halfWidth]}
                    value={dialogue.action || ''}
                    onChangeText={(text) => updateDialogue(index, 'action', text)}
                    placeholder="Action"
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDialogue(index)}
                >
                  <Text style={styles.removeButtonText}>Remove Dialogue</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addDialogue}>
              <Text style={styles.addButtonText}>+ Add Dialogue</Text>
            </TouchableOpacity>

            {formData.can_trade && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shop Items</Text>
                </View>

                {formData.shop_items?.map((itemId, index) => (
                  <View key={index} style={styles.shopItem}>
                    <Text style={styles.shopItemLabel}>Item {index + 1}</Text>
                    <TextInput
                      style={styles.input}
                      value={itemId.toString()}
                      onChangeText={(text) => updateShopItem(index, parseInt(text) || 0)}
                      placeholder="Enter item ID"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeShopItem(index)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={addShopItem}>
                  <Text style={styles.addButtonText}>+ Add Shop Item</Text>
                </TouchableOpacity>
              </>
            )}

            {formData.can_quest && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quests</Text>
                </View>

                {formData.quests?.map((questId, index) => (
                  <View key={index} style={styles.questItem}>
                    <Text style={styles.questLabel}>Quest {index + 1}</Text>
                    <TextInput
                      style={styles.input}
                      value={questId.toString()}
                      onChangeText={(text) => updateQuest(index, parseInt(text) || 0)}
                      placeholder="Enter quest ID"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeQuest(index)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={addQuest}>
                  <Text style={styles.addButtonText}>+ Add Quest</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save NPC</Text>
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
    width: '95%',
    maxHeight: '95%',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
    height: 60,
    textAlignVertical: 'top',
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
  dialogueItem: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dialogueLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  shopItem: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shopItemLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  questItem: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  questLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
