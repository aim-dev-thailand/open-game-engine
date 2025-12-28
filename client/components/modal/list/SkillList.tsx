import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';

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
  effects: any[];
  learnable_by: string[];
};

type SkillListProps = {
  visible: boolean;
  onClose: () => void;
  onEditSkill: (skill: SkillType) => void;
  wsRef: React.RefObject<WebSocket | null>;
};

export default function SkillList({ visible, onClose, onEditSkill, wsRef }: SkillListProps) {
  const [skills, setSkills] = useState<SkillType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSkills();
    }
  }, [visible]);

  const loadSkills = () => {
    setLoading(true);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'load_skill' }));
    }
    // รอรับข้อมูลจาก WebSocket
    // ในการใช้งานจริงจะมีการรับข้อมูลจาก onmessage
    setLoading(false);
  };

  const getElementColor = (element: string) => {
    switch (element) {
      case 'none': return '#9ca3af';
      case 'fire': return '#ef4444';
      case 'ice': return '#3b82f6';
      case 'lightning': return '#eab308';
      case 'earth': return '#a16207';
      case 'wind': return '#22c55e';
      case 'light': return '#fef08a';
      case 'dark': return '#7c3aed';
      default: return '#9ca3af';
    }
  };

  const getElementLabel = (element: string) => {
    switch (element) {
      case 'none': return 'ไม่มี';
      case 'fire': return 'ไฟ';
      case 'ice': return 'น้ำแข็ง';
      case 'lightning': return 'สายฟ้า';
      case 'earth': return 'ดิน';
      case 'wind': return 'ลม';
      case 'light': return 'แสง';
      case 'dark': return 'ความมืด';
      default: return element;
    }
  };

  const getSkillTypeLabel = (type: string) => {
    switch (type) {
      case 'active': return 'ใช้งาน';
      case 'passive': return 'พาสซีฟ';
      default: return type;
    }
  };

  const getEffectLabel = (effect: any) => {
    switch (effect.type) {
      case 'damage': return 'ดเมจ';
      case 'heal': return 'ฮีล';
      case 'buff': return 'บัฟ';
      case 'debuff': return 'ดีบัฟ';
      case 'status': return 'สถานะ';
      default: return effect.type;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>รายการสกิล</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>กำลังโหลด...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {skills.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>ไม่มีสกิล</Text>
                </View>
              ) : (
                skills.map((skill, index) => (
                  <View key={index} style={styles.skillCard}>
                    <View style={styles.skillHeader}>
                      <Text style={styles.skillName}>{skill.name}</Text>
                      <Text style={[styles.skillElement, { color: getElementColor(skill.element) }]}>
                        {getElementLabel(skill.element)}
                      </Text>
                    </View>
                    <Text style={styles.skillDescription} numberOfLines={2}>
                      {skill.description}
                    </Text>
                    <View style={styles.skillDetails}>
                      <Text style={styles.skillDetailText}>ประเภท: {getSkillTypeLabel(skill.skill_type)}</Text>
                      <Text style={styles.skillDetailText}>เลเวล: {skill.level_required}</Text>
                      <Text style={styles.skillDetailText}>MP: {skill.mp_cost}</Text>
                      <Text style={styles.skillDetailText}>คูลดาวน์: {skill.cooldown}วิ</Text>
                      <Text style={styles.skillDetailText}>ระยะ: {skill.range}</Text>
                      <Text style={styles.skillDetailText}>AoE: {skill.area_of_effect}</Text>
                    </View>
                    {skill.effects && skill.effects.length > 0 && (
                      <View style={styles.skillEffects}>
                        <Text style={styles.effectTitle}>เอฟเฟกต์:</Text>
                        {skill.effects.map((effect, idx) => (
                          <Text key={idx} style={styles.effectText}>
                            • {getEffectLabel(effect)}
                          </Text>
                        ))}
                      </View>
                    )}
                    {skill.learnable_by && skill.learnable_by.length > 0 && (
                      <View style={styles.skillLearnable}>
                        <Text style={styles.learnableTitle}>เรียนรู้โดย:</Text>
                        <Text style={styles.learnableText}>
                          {skill.learnable_by.join(', ')}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditSkill(skill)}
                    >
                      <Text style={styles.editButtonText}>แก้ไข</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
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
  modalContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#a0a0a0',
    fontSize: 16,
  },
  skillCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  skillElement: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  skillDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  skillDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillDetailText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginRight: 16,
  },
  skillEffects: {
    marginBottom: 8,
  },
  effectTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  effectText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginLeft: 8,
  },
  skillLearnable: {
    marginBottom: 8,
  },
  learnableTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  learnableText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
