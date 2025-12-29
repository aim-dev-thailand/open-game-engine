import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Image } from 'react-native';
import { CHARACTERS } from '@/assets/characters';

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
  npc_type: 'monster' | 'shop' | 'quest';
  crit_rate: number;
  dodge_value: number;
  hit_value: number;
  attack_first: boolean;
};

type EditNpcModalProps = {
  visible: boolean;
  onClose: () => void;
  npc?: NpcType;
  onSave: (npc: NpcType) => void;
  mode: 'create' | 'edit';
};

// สร้าง array ของ character sprite IDs (1-265)
const CHARACTER_IDS = Array.from({ length: 265 }, (_, i) => i + 1);

export default function EditNpcModal({ visible, onClose, npc, onSave, mode }: EditNpcModalProps) {
  const [formData, setFormData] = useState<NpcType>({
    name: '',
    description: '',
    sprite_id: '1',
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
    npc_type: 'monster',
    crit_rate: 0.05,
    dodge_value: 0.0,
    hit_value: 0.0,
    attack_first: false,
  });

  const [showSpritePicker, setShowSpritePicker] = useState(false);

  useEffect(() => {
    if (npc) {
      setFormData(npc);
    } else {
      setFormData({
        name: '',
        description: '',
        sprite_id: '1',
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
        npc_type: 'monster',
        crit_rate: 0.05,
        dodge_value: 0.0,
        hit_value: 0.0,
        attack_first: false,
      });
    }
  }, [npc, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อ NPC');
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

  const getCharacterImageSource = (id: string) => {
    try {
      const numId = parseInt(id) || 1;
      return CHARACTERS[numId];
    } catch {
      return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'create' ? 'สร้าง NPC ใหม่' : 'แก้ไข NPC'}</Text>
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
                placeholder="กรอกชื่อ NPC"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>คำอธิบาย</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="กรอกคำอธิบาย NPC"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ประเภท NPC</Text>
              <View style={styles.typeSelector}>
                {(['monster', 'shop', 'quest'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.npc_type === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, npc_type: type }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.npc_type === type && styles.typeButtonTextSelected
                    ]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Character Sprite</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sprite ID ที่เลือก: {formData.sprite_id}</Text>
              <TouchableOpacity
                style={styles.spritePreviewButton}
                onPress={() => setShowSpritePicker(!showSpritePicker)}
              >
                {getCharacterImageSource(formData.sprite_id) ? (
                  <Image
                    source={getCharacterImageSource(formData.sprite_id)!}
                    style={styles.spritePreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.spritePreviewText}>ไม่มีรูปภาพ</Text>
                )}
                <Text style={styles.spritePreviewLabel}>แตะเพื่อเปลี่ยน Character Sprite</Text>
              </TouchableOpacity>
            </View>

            {showSpritePicker && (
              <View style={styles.spritePicker}>
                <Text style={styles.label}>เลือก Character Sprite (1-265)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spriteScrollView}>
                  {CHARACTER_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.spriteItem,
                        formData.sprite_id === id.toString() && styles.spriteItemSelected,
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, sprite_id: id.toString() }));
                        setShowSpritePicker(false);
                      }}
                    >
                      {getCharacterImageSource(id.toString()) ? (
                        <Image
                          source={getCharacterImageSource(id.toString())!}
                          style={styles.spriteItemImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.spriteItemPlaceholder}>
                          <Text style={styles.spriteItemText}>{id}</Text>
                        </View>
                      )}
                      <Text style={styles.spriteItemLabel}>{id}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>เลเวล</Text>
                <TextInput
                  style={styles.input}
                  value={formData.level.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, level: parseInt(text) || 1 }))}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ความเร็ว</Text>
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
              <Text style={styles.sectionTitle}>ค่าสถานะ</Text>
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
                <Text style={styles.label}>HP สูงสุด</Text>
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
                <Text style={styles.label}>โจมตี</Text>
                <TextInput
                  style={styles.input}
                  value={formData.attack.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, attack: parseInt(text) || 10 }))}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ป้องกัน</Text>
                <TextInput
                  style={styles.input}
                  value={formData.defense.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, defense: parseInt(text) || 5 }))}
                  placeholder="5"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>อัตราคริติคอล (0.0-1.0)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.crit_rate.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, crit_rate: parseFloat(text) || 0.0 }))}
                  placeholder="0.05"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ค่าการแม่นยำ</Text>
                <TextInput
                  style={styles.input}
                  value={formData.hit_value.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, hit_value: parseFloat(text) || 0.0 }))}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ค่าการหลบหลีก</Text>
                <TextInput
                  style={styles.input}
                  value={formData.dodge_value.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, dodge_value: parseFloat(text) || 0.0 }))}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>พฤติกรรม</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ดุร้าย</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.is_hostile && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, is_hostile: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.is_hostile && styles.switchButtonTextActive]}>ไม่</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.is_hostile && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, is_hostile: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.is_hostile && styles.switchButtonTextActive]}>ใช่</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>โจมตีก่อน (Aggressive)</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.attack_first && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, attack_first: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.attack_first && styles.switchButtonTextActive]}>ไม่</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.attack_first && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, attack_first: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.attack_first && styles.switchButtonTextActive]}>ใช่</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>สามารถค้าขายได้</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.can_trade && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_trade: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.can_trade && styles.switchButtonTextActive]}>ไม่</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.can_trade && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_trade: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.can_trade && styles.switchButtonTextActive]}>ใช่</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>สามารถให้เควสได้</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[styles.switchButton, !formData.can_quest && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_quest: false }))}
                >
                  <Text style={[styles.switchButtonText, !formData.can_quest && styles.switchButtonTextActive]}>ไม่</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchButton, formData.can_quest && styles.switchButtonActive]}
                  onPress={() => setFormData(prev => ({ ...prev, can_quest: true }))}
                >
                  <Text style={[styles.switchButtonText, formData.can_quest && styles.switchButtonTextActive]}>ใช่</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ตำแหน่ง</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ตำแหน่ง X</Text>
                <TextInput
                  style={styles.input}
                  value={formData.position.x.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, position: { ...prev.position, x: parseInt(text) || 0 } }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ตำแหน่ง Y</Text>
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
              <Text style={styles.label}>ID แผนที่</Text>
              <TextInput
                style={styles.input}
                value={formData.map_id?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, map_id: parseInt(text) || undefined }))}
                placeholder="กรอก ID แผนที่"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>บทสนทนา</Text>
            </View>

            {formData.dialogue.map((dialogue, index) => (
              <View key={index} style={styles.dialogueItem}>
                <Text style={styles.dialogueLabel}>บทสนทนา {index + 1}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={dialogue.text}
                  onChangeText={(text) => updateDialogue(index, 'text', text)}
                  placeholder="กรอกข้อความบทสนทนา"
                  multiline
                  numberOfLines={2}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfWidth]}
                    value={dialogue.condition || ''}
                    onChangeText={(text) => updateDialogue(index, 'condition', text)}
                    placeholder="เงื่อนไข"
                  />
                  <TextInput
                    style={[styles.input, styles.halfWidth]}
                    value={dialogue.action || ''}
                    onChangeText={(text) => updateDialogue(index, 'action', text)}
                    placeholder="การกระทำ"
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDialogue(index)}
                >
                  <Text style={styles.removeButtonText}>ลบบทสนทนา</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addDialogue}>
              <Text style={styles.addButtonText}>+ เพิ่มบทสนทนา</Text>
            </TouchableOpacity>

            {formData.can_trade && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ไอเทมในร้าน</Text>
                </View>

                {formData.shop_items?.map((itemId, index) => (
                  <View key={index} style={styles.shopItem}>
                    <Text style={styles.shopItemLabel}>ไอเทม {index + 1}</Text>
                    <TextInput
                      style={styles.input}
                      value={itemId.toString()}
                      onChangeText={(text) => updateShopItem(index, parseInt(text) || 0)}
                      placeholder="กรอก ID ไอเทม"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeShopItem(index)}
                    >
                      <Text style={styles.removeButtonText}>ลบ</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={addShopItem}>
                  <Text style={styles.addButtonText}>+ เพิ่มไอเทมในร้าน</Text>
                </TouchableOpacity>
              </>
            )}

            {formData.can_quest && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>เควส</Text>
                </View>

                {formData.quests?.map((questId, index) => (
                  <View key={index} style={styles.questItem}>
                    <Text style={styles.questLabel}>เควส {index + 1}</Text>
                    <TextInput
                      style={styles.input}
                      value={questId.toString()}
                      onChangeText={(text) => updateQuest(index, parseInt(text) || 0)}
                      placeholder="กรอก ID เควส"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeQuest(index)}
                    >
                      <Text style={styles.removeButtonText}>ลบ</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={addQuest}>
                  <Text style={styles.addButtonText}>+ เพิ่มเควส</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>บันทึก NPC</Text>
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
  spritePreviewButton: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  spritePreviewImage: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  spritePreviewText: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 8,
  },
  spritePreviewLabel: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spritePicker: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  spriteScrollView: {
    maxHeight: 150,
  },
  spriteItem: {
    width: 90,
    marginRight: 12,
    padding: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  spriteItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#2a4a2e',
  },
  spriteItemImage: {
    width: 70,
    height: 70,
    marginBottom: 4,
  },
  spriteItemPlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  spriteItemText: {
    color: '#fff',
    fontSize: 12,
  },
  spriteItemLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
});
