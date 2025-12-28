import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';

type SkillEffectType = {
  id?: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status';
  value: number;
  duration?: number;
  target: 'self' | 'enemy' | 'ally' | 'all_allies' | 'all_enemies';
  stat?: 'attack' | 'defense' | 'speed' | 'hp' | 'mp';
};

type SkillType = {
  id?: number;
  name: string;
  description: string;
  icon_id?: string;
  skill_type: 'active' | 'passive';
  element: 'none' | 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'light' | 'dark';
  level_required: number;
  mp_cost: number;
  cooldown: number;
  cast_time: number;
  range: number;
  area_of_effect: number;
  effects: SkillEffectType[];
  learnable_by: string[];
};

type EditSkillModalProps = {
  visible: boolean;
  onClose: () => void;
  skill?: SkillType;
  onSave: (skill: SkillType) => void;
  mode: 'create' | 'edit';
};

export default function EditSkillModal({ visible, onClose, skill, onSave, mode }: EditSkillModalProps) {
  const [formData, setFormData] = useState<SkillType>({
    name: '',
    description: '',
    icon_id: '',
    skill_type: 'active',
    element: 'none',
    level_required: 1,
    mp_cost: 0,
    cooldown: 0,
    cast_time: 0,
    range: 1,
    area_of_effect: 0,
    effects: [],
    learnable_by: [],
  });

  useEffect(() => {
    if (skill) {
      setFormData(skill);
    } else {
      setFormData({
        name: '',
        description: '',
        icon_id: '',
        skill_type: 'active',
        element: 'none',
        level_required: 1,
        mp_cost: 0,
        cooldown: 0,
        cast_time: 0,
        range: 1,
        area_of_effect: 0,
        effects: [],
        learnable_by: [],
      });
    }
  }, [skill, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter skill name');
      return;
    }
    onSave(formData);
    onClose();
  };

  const addEffect = () => {
    const newEffect: SkillEffectType = {
      type: 'damage',
      value: 0,
      duration: 0,
      target: 'enemy',
      stat: 'hp',
    };
    setFormData(prev => ({
      ...prev,
      effects: [...prev.effects, newEffect],
    }));
  };

  const updateEffect = (index: number, field: keyof SkillEffectType, value: any) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.map((effect, i) => {
        if (i === index) {
          return { ...effect, [field]: value };
        }
        return effect;
      }),
    }));
  };

  const removeEffect = (index: number) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== index),
    }));
  };

  const addLearnableBy = () => {
    setFormData(prev => ({
      ...prev,
      learnable_by: [...prev.learnable_by, ''],
    }));
  };

  const updateLearnableBy = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      learnable_by: prev.learnable_by.map((role, i) => i === index ? value : role),
    }));
  };

  const removeLearnableBy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learnable_by: prev.learnable_by.filter((_, i) => i !== index),
    }));
  };

  const getElementColor = (element: string) => {
    const colors: { [key: string]: string } = {
      none: '#9ca3af',
      fire: '#ef4444',
      ice: '#3b82f6',
      lightning: '#eab308',
      earth: '#a16207',
      wind: '#22c55e',
      light: '#fef08a',
      dark: '#7c3aed',
    };
    return colors[element] || '#9ca3af';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'create' ? 'Create New Skill' : 'Edit Skill'}</Text>
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
                placeholder="Enter skill name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter skill description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon ID</Text>
              <TextInput
                style={styles.input}
                value={formData.icon_id || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, icon_id: text }))}
                placeholder="Enter icon ID"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Skill Type</Text>
                <View style={styles.switchContainer}>
                  <TouchableOpacity
                    style={[styles.switchButton, formData.skill_type === 'active' && styles.switchButtonActive]}
                    onPress={() => setFormData(prev => ({ ...prev, skill_type: 'active' }))}
                  >
                    <Text style={[styles.switchButtonText, formData.skill_type === 'active' && styles.switchButtonTextActive]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.switchButton, formData.skill_type === 'passive' && styles.switchButtonActive]}
                    onPress={() => setFormData(prev => ({ ...prev, skill_type: 'passive' }))}
                  >
                    <Text style={[styles.switchButtonText, formData.skill_type === 'passive' && styles.switchButtonTextActive]}>Passive</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Element</Text>
                <View style={styles.elementContainer}>
                  {(['none', 'fire', 'ice', 'lightning', 'earth', 'wind', 'light', 'dark'] as const).map((element) => (
                    <TouchableOpacity
                      key={element}
                      style={[
                        styles.elementButton,
                        { borderColor: getElementColor(element) },
                        formData.element === element && { backgroundColor: getElementColor(element) },
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, element }))}
                    >
                      <Text style={[
                        styles.elementButtonText,
                        formData.element === element && styles.elementButtonTextActive,
                      ]}>
                        {element.charAt(0).toUpperCase() + element.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requirements</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Level Required</Text>
              <TextInput
                style={styles.input}
                value={formData.level_required.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, level_required: parseInt(text) || 1 }))}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stats</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>MP Cost</Text>
                <TextInput
                  style={styles.input}
                  value={formData.mp_cost.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, mp_cost: parseInt(text) || 0 }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Cooldown (s)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cooldown.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, cooldown: parseFloat(text) || 0 }))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Cast Time (s)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cast_time.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, cast_time: parseFloat(text) || 0 }))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Range</Text>
                <TextInput
                  style={styles.input}
                  value={formData.range.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, range: parseFloat(text) || 1 }))}
                  placeholder="1"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Area of Effect</Text>
              <TextInput
                style={styles.input}
                value={formData.area_of_effect.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, area_of_effect: parseFloat(text) || 0 }))}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Effects</Text>
            </View>

            {formData.effects.map((effect, index) => (
              <View key={index} style={styles.effectItem}>
                <Text style={styles.effectLabel}>Effect {index + 1}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.effectTypeContainer}>
                    {(['damage', 'heal', 'buff', 'debuff', 'status'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.effectTypeButton,
                          effect.type === type && styles.effectTypeButtonActive,
                        ]}
                        onPress={() => updateEffect(index, 'type', type)}
                      >
                        <Text style={[
                          styles.effectTypeButtonText,
                          effect.type === type && styles.effectTypeButtonTextActive,
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Value</Text>
                    <TextInput
                      style={styles.input}
                      value={effect.value.toString()}
                      onChangeText={(text) => updateEffect(index, 'value', parseInt(text) || 0)}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Duration (s)</Text>
                    <TextInput
                      style={styles.input}
                      value={effect.duration?.toString() || '0'}
                      onChangeText={(text) => updateEffect(index, 'duration', parseFloat(text) || 0)}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Target</Text>
                  <View style={styles.targetContainer}>
                    {(['self', 'enemy', 'ally', 'all_allies', 'all_enemies'] as const).map((target) => (
                      <TouchableOpacity
                        key={target}
                        style={[
                          styles.targetButton,
                          effect.target === target && styles.targetButtonActive,
                        ]}
                        onPress={() => updateEffect(index, 'target', target)}
                      >
                        <Text style={[
                          styles.targetButtonText,
                          effect.target === target && styles.targetButtonTextActive,
                        ]}>
                          {target.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {(effect.type === 'buff' || effect.type === 'debuff') && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Stat</Text>
                    <View style={styles.statContainer}>
                      {(['attack', 'defense', 'speed', 'hp', 'mp'] as const).map((stat) => (
                        <TouchableOpacity
                          key={stat}
                          style={[
                            styles.statButton,
                            effect.stat === stat && styles.statButtonActive,
                          ]}
                          onPress={() => updateEffect(index, 'stat', stat)}
                        >
                          <Text style={[
                            styles.statButtonText,
                            effect.stat === stat && styles.statButtonTextActive,
                          ]}>
                            {stat.charAt(0).toUpperCase() + stat.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeEffect(index)}
                >
                  <Text style={styles.removeButtonText}>Remove Effect</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addEffect}>
              <Text style={styles.addButtonText}>+ Add Effect</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Learnable By</Text>
            </View>

            {formData.learnable_by.map((role, index) => (
              <View key={index} style={styles.learnableItem}>
                <Text style={styles.learnableLabel}>Role {index + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={role}
                  onChangeText={(text) => updateLearnableBy(index, text)}
                  placeholder="Enter role name"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeLearnableBy(index)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addLearnableBy}>
              <Text style={styles.addButtonText}>+ Add Role</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Skill</Text>
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
    height: 80,
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
    padding: 10,
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
    fontSize: 14,
    textAlign: 'center',
  },
  switchButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  elementContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  elementButton: {
    flex: 1,
    minWidth: '22%',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#2a2a4e',
    borderWidth: 2,
  },
  elementButtonText: {
    color: '#a0a0a0',
    fontSize: 10,
    textAlign: 'center',
  },
  elementButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  effectItem: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  effectLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  effectTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  effectTypeButton: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  effectTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  effectTypeButtonText: {
    color: '#a0a0a0',
    fontSize: 12,
    textAlign: 'center',
  },
  effectTypeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  targetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetButton: {
    flex: 1,
    minWidth: '30%',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  targetButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  targetButtonText: {
    color: '#a0a0a0',
    fontSize: 10,
    textAlign: 'center',
  },
  targetButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statButton: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statButtonText: {
    color: '#a0a0a0',
    fontSize: 12,
    textAlign: 'center',
  },
  statButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  learnableItem: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  learnableLabel: {
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
