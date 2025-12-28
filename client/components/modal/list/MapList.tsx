import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';

type MapType = {
  id?: number;
  name: string;
  description: string;
  width: number;
  height: number;
  tiles: any[];
  spawn_points: { x: number; y: number }[];
  npcs: { id: number; x: number; y: number }[];
  monsters: { template_id: number; x: number; y: number }[];
};

type MapListProps = {
  visible: boolean;
  onClose: () => void;
  onEditMap: (map: MapType) => void;
  wsRef: React.RefObject<WebSocket | null>;
};

export default function MapList({ visible, onClose, onEditMap, wsRef }: MapListProps) {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMaps();
    }
  }, [visible]);

  const loadMaps = () => {
    setLoading(true);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'load_map' }));
    }
    // รอรับข้อมูลจาก WebSocket
    // ในการใช้งานจริงจะมีการรับข้อมูลจาก onmessage
    setLoading(false);
  };

  const getTileCount = (tiles: any[]) => {
    return tiles ? tiles.length : 0;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>รายการแผนที่</Text>
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
              {maps.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>ไม่มีแผนที่</Text>
                </View>
              ) : (
                maps.map((map, index) => (
                  <View key={index} style={styles.mapCard}>
                    <View style={styles.mapHeader}>
                      <Text style={styles.mapName}>{map.name}</Text>
                      <Text style={styles.mapSize}>
                        {map.width}x{map.height}
                      </Text>
                    </View>
                    <Text style={styles.mapDescription} numberOfLines={2}>
                      {map.description}
                    </Text>
                    <View style={styles.mapDetails}>
                      <Text style={styles.mapDetailText}>
                        📐 ขนาด: {map.width} x {map.height}
                      </Text>
                      <Text style={styles.mapDetailText}>
                        🧱 ไทล์: {getTileCount(map.tiles)}
                      </Text>
                      <Text style={styles.mapDetailText}>
                        🚩 Spawn: {map.spawn_points?.length || 0} จุด
                      </Text>
                      <Text style={styles.mapDetailText}>
                        👤 NPC: {map.npcs?.length || 0} ตัว
                      </Text>
                      <Text style={styles.mapDetailText}>
                        👾 มอนสเตอร์: {map.monsters?.length || 0} ตัว
                      </Text>
                    </View>
                    {map.spawn_points && map.spawn_points.length > 0 && (
                      <View style={styles.mapFeatures}>
                        <Text style={styles.featureTitle}>จุดเกิด:</Text>
                        {map.spawn_points.slice(0, 3).map((spawn, idx) => (
                          <Text key={idx} style={styles.featureText}>
                            • ({spawn.x}, {spawn.y})
                          </Text>
                        ))}
                        {map.spawn_points.length > 3 && (
                          <Text style={styles.featureText}>
                            • และอีก {map.spawn_points.length - 3} จุด
                          </Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditMap(map)}
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
  mapCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  mapSize: {
    fontSize: 12,
    color: '#a0a0a0',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mapDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  mapDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  mapDetailText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginRight: 16,
  },
  mapFeatures: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featureText: {
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
