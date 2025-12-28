import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';

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

type ItemListProps = {
  visible: boolean;
  onClose: () => void;
  onEditItem: (item: ItemType) => void;
  wsRef: React.RefObject<WebSocket | null>;
};

export default function ItemList({ visible, onClose, onEditItem, wsRef }: ItemListProps) {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
    }
  }, [visible]);

  const loadItems = () => {
    setLoading(true);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'load_item' }));
    }
    // รอรับข้อมูลจาก WebSocket
    // ในการใช้งานจริงจะมีการรับข้อมูลจาก onmessage
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9ca3af';
      case 'uncommon': return '#22c55e';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'weapon': return 'อาวุธ';
      case 'armor': return 'เกราะ';
      case 'consumable': return 'ของใช้';
      case 'material': return 'วัสดุ';
      default: return type;
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'สามัญ';
      case 'uncommon': return 'ไม่สามัญ';
      case 'rare': return 'หายาก';
      case 'epic': return 'มหาศาล';
      case 'legendary': return 'ตำนาน';
      default: return rarity;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>รายการไอเทม</Text>
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
              {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>ไม่มีไอเทม</Text>
                </View>
              ) : (
                items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={[styles.itemRarity, { color: getRarityColor(item.rarity) }]}>
                        {getRarityLabel(item.rarity)}
                      </Text>
                    </View>
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemDetailText}>ประเภท: {getTypeLabel(item.type)}</Text>
                      <Text style={styles.itemDetailText}>มูลค่า: {item.value}</Text>
                      {item.stackable && (
                        <Text style={styles.itemDetailText}>สูงสุด: {item.max_stack || 1}</Text>
                      )}
                    </View>
                    {item.stats && (
                      <View style={styles.itemStats}>
                        {item.stats.attack !== undefined && (
                          <Text style={styles.statText}>⚔️ โจมตี: {item.stats.attack}</Text>
                        )}
                        {item.stats.defense !== undefined && (
                          <Text style={styles.statText}>🛡️ ป้องกัน: {item.stats.defense}</Text>
                        )}
                        {item.stats.hp !== undefined && (
                          <Text style={styles.statText}>❤️ HP: {item.stats.hp}</Text>
                        )}
                        {item.stats.mp !== undefined && (
                          <Text style={styles.statText}>💙 MP: {item.stats.mp}</Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditItem(item)}
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
  itemCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  itemRarity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  itemDetailText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginRight: 16,
  },
  itemStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginRight: 16,
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
