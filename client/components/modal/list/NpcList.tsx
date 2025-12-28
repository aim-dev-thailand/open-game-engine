import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';

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
  dialogue: any[];
  shop_items?: number[];
  quests?: number[];
  position: { x: number; y: number };
  map_id?: number;
};

type NpcListProps = {
  visible: boolean;
  onClose: () => void;
  onEditNpc: (npc: NpcType) => void;
  wsRef: React.RefObject<WebSocket | null>;
};

export default function NpcList({ visible, onClose, onEditNpc, wsRef }: NpcListProps) {
  const [npcs, setNpcs] = useState<NpcType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNpcs();
    }
  }, [visible]);

  const loadNpcs = () => {
    setLoading(true);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'load_npc' }));
    }
    // รอรับข้อมูลจาก WebSocket
    // ในการใช้งานจริงจะมีการรับข้อมูลจาก onmessage
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>รายการ NPC</Text>
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
              {npcs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>ไม่มี NPC</Text>
                </View>
              ) : (
                npcs.map((npc, index) => (
                  <View key={index} style={styles.npcCard}>
                    <View style={styles.npcHeader}>
                      <Text style={styles.npcName}>{npc.name}</Text>
                      <View style={styles.npcBadges}>
                        {npc.is_hostile && (
                          <Text style={styles.hostileBadge}>⚔️ ศัตรู</Text>
                        )}
                        {npc.can_trade && (
                          <Text style={styles.tradeBadge}>💰 ค้าขาย</Text>
                        )}
                        {npc.can_quest && (
                          <Text style={styles.questBadge}>📜 เควส</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.npcDescription} numberOfLines={2}>
                      {npc.description}
                    </Text>
                    <View style={styles.npcStats}>
                      <Text style={styles.statText}>🎯 เลเวล: {npc.level}</Text>
                      <Text style={styles.statText}>❤️ HP: {npc.hp}/{npc.max_hp}</Text>
                      <Text style={styles.statText}>⚔️ โจมตี: {npc.attack}</Text>
                      <Text style={styles.statText}>🛡️ ป้องกัน: {npc.defense}</Text>
                      <Text style={styles.statText}>🏃 ความเร็ว: {npc.move_speed}</Text>
                    </View>
                    <View style={styles.npcPosition}>
                      <Text style={styles.positionText}>
                        ตำแหน่ง: ({npc.position.x}, {npc.position.y})
                      </Text>
                      {npc.map_id && (
                        <Text style={styles.positionText}>แผนที่: {npc.map_id}</Text>
                      )}
                    </View>
                    {npc.shop_items && npc.shop_items.length > 0 && (
                      <View style={styles.npcFeatures}>
                        <Text style={styles.featureTitle}>ขายไอเทม: {npc.shop_items.length} ชิ้น</Text>
                      </View>
                    )}
                    {npc.quests && npc.quests.length > 0 && (
                      <View style={styles.npcFeatures}>
                        <Text style={styles.featureTitle}>มีเควส: {npc.quests.length} อัน</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditNpc(npc)}
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
  npcCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  npcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  npcName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  npcBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 8,
  },
  hostileBadge: {
    fontSize: 10,
    backgroundColor: '#ef4444',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  tradeBadge: {
    fontSize: 10,
    backgroundColor: '#22c55e',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  questBadge: {
    fontSize: 10,
    backgroundColor: '#eab308',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  npcDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  npcStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginRight: 16,
  },
  npcPosition: {
    marginBottom: 8,
  },
  positionText: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  npcFeatures: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    color: '#a0a0a0',
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
