import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Image } from 'react-native';
import { TILESETS } from '@/assets/tilesets';

type MapTileType = {
  id?: number;
  x: number;
  y: number;
  type: 'ground' | 'wall' | 'water' | 'grass' | 'road' | 'obstacle';
  walkable: boolean;
  sprite_id?: string;
  tileset_id?: number;
};

type MapType = {
  id?: number;
  name: string;
  description: string;
  width: number;
  height: number;
  tiles: MapTileType[];
  spawn_points: { x: number; y: number }[];
  npcs: { id: number; x: number; y: number }[];
  monsters: { template_id: number; x: number; y: number }[];
  tileset_id?: number;
};

type EditMapModalProps = {
  visible: boolean;
  onClose: () => void;
  map?: MapType;
  onSave: (map: MapType) => void;
  mode: 'create' | 'edit';
};

// สร้าง array ของ tileset IDs (1-115)
const TILESET_IDS = Array.from({ length: 115 }, (_, i) => i + 1);

export default function EditMapModal({ visible, onClose, map, onSave, mode }: EditMapModalProps) {
  const [formData, setFormData] = useState<MapType>({
    name: '',
    description: '',
    width: 20,
    height: 20,
    tiles: [],
    spawn_points: [],
    npcs: [],
    monsters: [],
    tileset_id: 1,
  });

  const [selectedTileType, setSelectedTileType] = useState<MapTileType['type']>('ground');
  const [selectedTileset, setSelectedTileset] = useState<number>(1);
  const [showTilesetPicker, setShowTilesetPicker] = useState(false);

  useEffect(() => {
    if (map) {
      setFormData(map);
      setSelectedTileset(map.tileset_id || 1);
    } else {
      setFormData({
        name: '',
        description: '',
        width: 20,
        height: 20,
        tiles: [],
        spawn_points: [],
        npcs: [],
        monsters: [],
        tileset_id: 1,
      });
      setSelectedTileset(1);
    }
  }, [map, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อแผนที่');
      return;
    }
    if (formData.width < 5 || formData.height < 5) {
      Alert.alert('ข้อผิดพลาด', 'ขนาดแผนที่ต้องอย่างน้อย 5x5');
      return;
    }
    onSave({ ...formData, tileset_id: selectedTileset });
    onClose();
  };

  const generateTiles = () => {
    const tiles: MapTileType[] = [];
    for (let y = 0; y < formData.height; y++) {
      for (let x = 0; x < formData.width; x++) {
        tiles.push({
          x,
          y,
          type: 'ground',
          walkable: true,
          tileset_id: selectedTileset,
        });
      }
    }
    setFormData(prev => ({ ...prev, tiles }));
  };

  const updateTile = (x: number, y: number) => {
    const updatedTiles = formData.tiles.map(tile => {
      if (tile.x === x && tile.y === y) {
        return {
          ...tile,
          type: selectedTileType,
          walkable: selectedTileType !== 'wall' && selectedTileType !== 'water',
          tileset_id: selectedTileset,
        };
      }
      return tile;
    });
    setFormData(prev => ({ ...prev, tiles: updatedTiles }));
  };

  const getTileColor = (type: MapTileType['type']) => {
    const colors: { [key: string]: string } = {
      ground: '#8B7355',
      wall: '#4a4a4a',
      water: '#3b82f6',
      grass: '#22c55e',
      road: '#a8a29e',
      obstacle: '#ef4444',
    };
    return colors[type] || '#8B7355';
  };

  const getTileLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      ground: 'พื้นดิน',
      wall: 'กำแพง',
      water: 'น้ำ',
      grass: 'หญ้า',
      road: 'ถนน',
      obstacle: 'สิ่งกีดขวาง',
    };
    return labels[type] || type;
  };

  const addSpawnPoint = () => {
    const newSpawnPoint = { x: Math.floor(formData.width / 2), y: Math.floor(formData.height / 2) };
    setFormData(prev => ({
      ...prev,
      spawn_points: [...prev.spawn_points, newSpawnPoint],
    }));
  };

  const removeSpawnPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      spawn_points: prev.spawn_points.filter((_, i) => i !== index),
    }));
  };

  const getTilesetImageSource = (id: number) => {
    try {
      return TILESETS[id];
    } catch {
      return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'create' ? 'สร้างแผนที่ใหม่' : 'แก้ไขแผนที่'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>ชื่อแผนที่ *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="กรอกชื่อแผนที่"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>คำอธิบาย</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="กรอกคำอธิบายแผนที่"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ความกว้าง</Text>
                <TextInput
                  style={styles.input}
                  value={formData.width.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, width: parseInt(text) || 20 }))}
                  placeholder="20"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>ความสูง</Text>
                <TextInput
                  style={styles.input}
                  value={formData.height.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, height: parseInt(text) || 20 }))}
                  placeholder="20"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tileset</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tileset ที่เลือก: {selectedTileset}</Text>
              <TouchableOpacity
                style={styles.tilesetPreviewButton}
                onPress={() => setShowTilesetPicker(!showTilesetPicker)}
              >
                {selectedTileset && getTilesetImageSource(selectedTileset) ? (
                  <Image
                    source={getTilesetImageSource(selectedTileset)!}
                    style={styles.tilesetPreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.tilesetPreviewText}>ไม่มีรูปภาพ</Text>
                )}
                <Text style={styles.tilesetPreviewLabel}>แตะเพื่อเปลี่ยน Tileset</Text>
              </TouchableOpacity>
            </View>

            {showTilesetPicker && (
              <View style={styles.tilesetPicker}>
                <Text style={styles.label}>เลือก Tileset (1-115)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tilesetScrollView}>
                  {TILESET_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.tilesetItem,
                        selectedTileset === id && styles.tilesetItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedTileset(id);
                        setFormData(prev => ({ ...prev, tileset_id: id }));
                        setShowTilesetPicker(false);
                      }}
                    >
                      {getTilesetImageSource(id) ? (
                        <Image
                          source={getTilesetImageSource(id)!}
                          style={styles.tilesetItemImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.tilesetItemPlaceholder}>
                          <Text style={styles.tilesetItemText}>{id}</Text>
                        </View>
                      )}
                      <Text style={styles.tilesetItemLabel}>{id}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.generateButton} onPress={generateTiles}>
              <Text style={styles.generateButtonText}>สร้าง Tiles</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ตัวแก้ไข Tiles</Text>
            </View>

            <View style={styles.tileTypeContainer}>
              {(['ground', 'wall', 'water', 'grass', 'road', 'obstacle'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tileTypeButton,
                    { backgroundColor: getTileColor(type) },
                    selectedTileType === type && styles.tileTypeButtonActive,
                  ]}
                  onPress={() => setSelectedTileType(type)}
                >
                  <Text style={styles.tileTypeButtonText}>
                    {getTileLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formData.tiles.length > 0 && (
              <View style={styles.mapPreviewContainer}>
                <Text style={styles.label}>ตัวอย่างแผนที่ (แตะเพื่อแก้ไข tiles)</Text>
                <View style={styles.mapGrid}>
                  {formData.tiles.map((tile, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.mapTile,
                        { backgroundColor: getTileColor(tile.type) },
                      ]}
                      onPress={() => updateTile(tile.x, tile.y)}
                    >
                      <Text style={styles.mapTileText}>{tile.x},{tile.y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>จุดเริ่มต้น</Text>
            </View>

            <View style={styles.spawnPointList}>
              {formData.spawn_points.map((point, index) => (
                <View key={index} style={styles.spawnPointItem}>
                  <Text style={styles.spawnPointText}>
                    จุดเริ่ม {index + 1}: ({point.x}, {point.y})
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSpawnPoint(index)}
                  >
                    <Text style={styles.removeButtonText}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addSpawnPoint}>
              <Text style={styles.addButtonText}>+ เพิ่มจุดเริ่มต้น</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NPCs</Text>
            </View>

            <View style={styles.npcList}>
              {formData.npcs.map((npc, index) => (
                <View key={index} style={styles.npcItem}>
                  <Text style={styles.npcText}>NPC ID: {npc.id} ที่ ({npc.x}, {npc.y})</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setFormData(prev => ({
                      ...prev,
                      npcs: prev.npcs.filter((_, i) => i !== index),
                    }))}
                  >
                    <Text style={styles.removeButtonText}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const newNpc = { id: 0, x: Math.floor(formData.width / 2), y: Math.floor(formData.height / 2) };
                setFormData(prev => ({ ...prev, npcs: [...prev.npcs, newNpc] }));
              }}
            >
              <Text style={styles.addButtonText}>+ เพิ่ม NPC</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>มอนสเตอร์</Text>
            </View>

            <View style={styles.monsterList}>
              {formData.monsters.map((monster, index) => (
                <View key={index} style={styles.monsterItem}>
                  <Text style={styles.monsterText}>Template ID: {monster.template_id} ที่ ({monster.x}, {monster.y})</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setFormData(prev => ({
                      ...prev,
                      monsters: prev.monsters.filter((_, i) => i !== index),
                    }))}
                  >
                    <Text style={styles.removeButtonText}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const newMonster = { template_id: 0, x: Math.floor(formData.width / 2), y: Math.floor(formData.height / 2) };
                setFormData(prev => ({ ...prev, monsters: [...prev.monsters, newMonster] }));
              }}
            >
              <Text style={styles.addButtonText}>+ เพิ่มมอนสเตอร์</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>บันทึกแผนที่</Text>
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
  generateButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
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
  tilesetPreviewButton: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  tilesetPreviewImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  tilesetPreviewText: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 8,
  },
  tilesetPreviewLabel: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tilesetPicker: {
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tilesetScrollView: {
    maxHeight: 150,
  },
  tilesetItem: {
    width: 100,
    marginRight: 12,
    padding: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  tilesetItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#2a4a2e',
  },
  tilesetItemImage: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  tilesetItemPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tilesetItemText: {
    color: '#fff',
    fontSize: 12,
  },
  tilesetItemLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  tileTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tileTypeButton: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileTypeButtonActive: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  tileTypeButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  mapPreviewContainer: {
    marginBottom: 16,
  },
  mapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  mapTile: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  mapTileText: {
    fontSize: 8,
    color: '#fff',
  },
  spawnPointList: {
    marginBottom: 16,
  },
  spawnPointItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  spawnPointText: {
    color: '#fff',
    fontSize: 14,
  },
  npcList: {
    marginBottom: 16,
  },
  npcItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  npcText: {
    color: '#fff',
    fontSize: 14,
  },
  monsterList: {
    marginBottom: 16,
  },
  monsterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  monsterText: {
    color: '#fff',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
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
