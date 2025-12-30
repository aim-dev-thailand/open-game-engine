import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Modal } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import { WS_API } from '@/env';
import { CHARACTERS } from '@/assets/characters';
import { TILESETS } from '@/assets/tilesets';
import { CharacterData } from '@/model/character';
import * as THREE from 'three';
import Joypad from './ui/Joypad';
import ActionPad from './ui/ActionPad';
import DamageFloater from './ui/DamageFloater';
import EditItemModal from './modal/edit/EditItem';
import EditMapModal from './modal/edit/EditMap';
import EditNpcModal from './modal/edit/EditNpc';
import EditSkillModal from './modal/edit/EditSkill';
import ItemList from './modal/list/ItemList';
import SkillList from './modal/list/SkillList';
import NpcList from './modal/list/NpcList';
import MapList from './modal/list/MapList';


type GameScreenProps = {
  username: string;
  character: CharacterData;
  onLogout: () => void;
  role?: string;
};

type DamageType = {
  id: number;
  x: number;
  y: number;
  damage: number;
  is_critical: boolean;
};

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

type MapType = {
  id?: number;
  name: string;
  description: string;
  width: number;
  height: number;
  tiles: any[];
  spawn_points: { x: number; y: number }[];
  npcs: { id: number; x: number; y: number }[];
  monsters: { id: number; x: number; y: number }[];
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
  dialogue: any[];
  shop_items?: number[];
  quests?: number[];
  position: { x: number; y: number };
  map_id?: number;
  npc_type: 'monster' | 'shop' | 'quest';
  crit_rate: number;
  evasion: number;
  accuracy: number;
  is_attack_first: boolean;
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
  effects: any[];
  learnable_by: string[];
};

export default function GameScreen({ username, character, onLogout, role = 'user' }: GameScreenProps) {
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const mapMeshesRef = useRef<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const facingDir = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [damages, setDamages] = useState<DamageType[]>([]);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // List modal states
  const [showItemList, setShowItemList] = useState(false);
  const [showSkillList, setShowSkillList] = useState(false);
  const [showNpcList, setShowNpcList] = useState(false);
  const [showMapList, setShowMapList] = useState(false);

  // Edit modal states
  const [showEditItem, setShowEditItem] = useState(false);
  const [showEditMap, setShowEditMap] = useState(false);
  const [showEditNpc, setShowEditNpc] = useState(false);
  const [showEditSkill, setShowEditSkill] = useState(false);

  // Edit modes
  const [itemEditMode, setItemEditMode] = useState<'create' | 'edit'>('create');
  const [mapEditMode, setMapEditMode] = useState<'create' | 'edit'>('create');
  const [npcEditMode, setNpcEditMode] = useState<'create' | 'edit'>('create');
  const [skillEditMode, setSkillEditMode] = useState<'create' | 'edit'>('create');

  // Current editing items
  const [currentItem, setCurrentItem] = useState<ItemType | undefined>();
  const [currentMap, setCurrentMap] = useState<MapType | undefined>();
  const [currentNpc, setCurrentNpc] = useState<NpcType | undefined>();
  const [currentSkill, setCurrentSkill] = useState<SkillType | undefined>();

  const [mapData, setMapData] = useState<MapType | undefined>(undefined);

  const isAdmin = role === 'admin' || role === 'moderator';

  useEffect(() => {
    if (mapData && sceneRef.current) {
      // Clear old map
      mapMeshesRef.current.forEach(mesh => {
        sceneRef.current.remove(mesh);
        // Dispose geometry/material if possible to prevent leak
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m: any) => m.dispose());
          else mesh.material.dispose();
        }
      });
      mapMeshesRef.current = [];

      // Render new map
      mapData.tiles.forEach(tile => {
        if (tile.tileX !== undefined && tile.tileY !== undefined) {
          const tilesetId = tile.tileset_id || 1;
          const asset = TILESETS[tilesetId];
          if (!asset) return;

          const textureLoader = new TextureLoader();
          textureLoader.load(asset, (texture: any) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter; // Also set minFilter

            // Calculate UVs
            const tileWidth = 32;
            const tileHeight = 32;
            const imageWidth = texture.image.width;
            const imageHeight = texture.image.height;

            const cols = imageWidth / tileWidth;
            const rows = imageHeight / tileHeight;

            const x = tile.tileX || 0;
            const y = tile.tileY || 0;

            // UV coordinates (0,0 is bottom-left in Three.js)
            // But usually image coordinates are (0,0) top-left.
            // Three.js Texture has flipY = true by default? No, usually false for standard loaders but Expo TextureLoader might vary.
            // Let's assume standard UV: (0,0) is bottom-left.
            // We want (x, y) tile from Top-Left.
            // uLeft = x / cols
            // uRight = (x+1) / cols
            // vTop = 1 - (y / rows)
            // vBottom = 1 - ((y+1) / rows)

            const uLeft = x / cols;
            const uRight = (x + 1) / cols;
            const vTop = 1 - (y / rows);
            const vBottom = 1 - ((y + 1) / rows);

            const geometry = new THREE.PlaneGeometry(1, 1);
            const uvs = geometry.attributes.uv;

            // UV mapping order: TL, TR, BL, BR for PlaneGeometry?
            // PlaneGeometry(1, 1) default:
            // 0: (-0.5, 0.5, 0) -> UV(0, 1) Top Left
            // 1: ( 0.5, 0.5, 0) -> UV(1, 1) Top Right
            // 2: (-0.5,-0.5, 0) -> UV(0, 0) Bottom Left
            // 3: ( 0.5,-0.5, 0) -> UV(1, 0) Bottom Right

            uvs.setXY(0, uLeft, vTop);     // TL
            uvs.setXY(1, uRight, vTop);    // TR
            uvs.setXY(2, uLeft, vBottom);  // BL
            uvs.setXY(3, uRight, vBottom); // BR
            uvs.needsUpdate = true;

            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(tile.x, 0, tile.y);
            mesh.rotation.x = -Math.PI / 2; // Flat on ground

            if (sceneRef.current) {
              sceneRef.current.add(mesh);
              mapMeshesRef.current.push(mesh);
            }
          });
        }
      });
    }
  }, [mapData]);

  useEffect(() => {
    wsRef.current = new WebSocket(WS_API);

    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({ type: 'login', username }));
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        // setMyId(data.id); // Not used
        if (data.map) {
          setMapData(data.map);
        }
      } else if (data.type === 'damage') {
        addDamage(
          Dimensions.get('window').width / 2,
          Dimensions.get('window').height / 2,
          100,
          true
        );
      } else if (data.type === 'role_update') {
        // Role updated from server
      } else if (data.type === 'items_loaded') {
        console.log('ไอเทมโหลดแล้ว:', data.items);
      } else if (data.type === 'skills_loaded') {
        console.log('สกิลโหลดแล้ว:', data.skills);
      } else if (data.type === 'npcs_loaded') {
        console.log('NPC โหลดแล้ว:', data.npcs);
      } else if (data.type === 'maps_loaded') {
        console.log('แผนที่โหลดแล้ว:', data.maps);
        if (data.maps && data.maps.length > 0) {
          setMapData(data.maps[0]);
        }
      }
    };

    wsRef.current.onclose = () => {
      onLogout();
    };

    wsRef.current.onerror = () => {
      onLogout();
    };
  }, [username]);

  const addDamage = (x: number, y: number, dmg: number, isCrit: boolean) => {
    const id = Date.now();
    setDamages(prev => [...prev, { id, x, y, damage: dmg, is_critical: isCrit }]);
  };

  const handleAttack = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'attack' }));
    }
  };

  const onContextCreate = async (gl: any) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    sceneRef.current = scene;

    const grid = new THREE.GridHelper(1000, 50, 0x444444, 0x111111);
    scene.add(grid);

    const spriteId = character.sprite_id ? Number(character.sprite_id) : 1;
    const spriteAsset = CHARACTERS[spriteId] || CHARACTERS[1];

    const textureLoader = new TextureLoader();
    const texture = textureLoader.load(spriteAsset);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    // Sprite is 4x4, we want top-left
    // UVs are 0,0 (bottom-left) to 1,1 (top-right)
    // Top-left 1/4 means U: 0-0.25, V: 0.75-1.0

    // Using PlaneGeometry to control UVs easily
    const geometry = new THREE.PlaneGeometry(1, 1.5);

    // Update UVs for top-left frame
    const uvs = geometry.attributes.uv;
    // 0: top-left (0, 1) -> (0, 1)
    // 1: top-right (1, 1) -> (0.25, 1)
    // 2: bottom-left (0, 0) -> (0, 0.75)
    // 3: bottom-right (1, 0) -> (0.25, 0.75)

    // Standard PlaneGeometry UV mapping:
    // 0: (0, 1) Top Left
    // 1: (1, 1) Top Right
    // 2: (0, 0) Bottom Left
    // 3: (1, 0) Bottom Right

    // We want:
    // Top Left: (0, 1)
    // Top Right: (0.25, 1)
    // Bottom Left: (0, 0.75)
    // Bottom Right: (0.25, 0.75)

    uvs.setXY(0, 0, 1.0); // Top Left
    uvs.setXY(1, 0.25, 1.0); // Top Right
    uvs.setXY(2, 0, 0.75); // Bottom Left
    uvs.setXY(3, 0.25, 0.75); // Bottom Right

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.y = 0.75;
    // Rotate to face camera (Billboardish)
    // Camera is at (0, 10, 10) looking at (0, 0, 0). Angle is 45 deg down.
    // So sprite plane (default vertical) needs to tilt back 45 deg?
    // Actually, simply:
    playerMesh.rotation.x = -Math.PI / 4; // 45 degrees back
    scene.add(playerMesh);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);

    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();
  };

  // Admin menu handlers
  const handleCreateItem = () => {
    setItemEditMode('create');
    setCurrentItem(undefined);
    setShowEditItem(true);
    setShowAdminMenu(false);
  };

  const handleEditItem = (item: ItemType) => {
    setItemEditMode('edit');
    setCurrentItem(item);
    setShowEditItem(true);
    setShowAdminMenu(false);
  };

  const handleCreateMap = () => {
    setMapEditMode('create');
    setCurrentMap(undefined);
    setShowEditMap(true);
    setShowAdminMenu(false);
  };

  const handleEditMap = (map: MapType) => {
    setMapEditMode('edit');
    setCurrentMap(map);
    setShowEditMap(true);
    setShowAdminMenu(false);
  };

  const handleCreateNpc = () => {
    setNpcEditMode('create');
    setCurrentNpc(undefined);
    setShowEditNpc(true);
    setShowAdminMenu(false);
  };

  const handleEditNpc = (npc: NpcType) => {
    setNpcEditMode('edit');
    setCurrentNpc(npc);
    setShowEditNpc(true);
    setShowAdminMenu(false);
  };

  const handleCreateSkill = () => {
    setSkillEditMode('create');
    setCurrentSkill(undefined);
    setShowEditSkill(true);
    setShowAdminMenu(false);
  };

  const handleEditSkill = (skill: SkillType) => {
    setSkillEditMode('edit');
    setCurrentSkill(skill);
    setShowEditSkill(true);
    setShowAdminMenu(false);
  };

  const handleSaveItem = (item: ItemType) => {
    console.log('Saving item:', item);
    // Send to server via WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'save_item', item }));
    }
    setShowEditItem(false);
  };

  const handleSaveMap = (map: MapType) => {
    console.log('Saving map:', map);
    // Send to server via WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'save_map', map }));
    }
    setShowEditMap(false);
  };

  const handleSaveNpc = (npc: NpcType) => {
    console.log('Saving npc:', npc);
    // Send to server via WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'save_npc', npc }));
    }
    setShowEditNpc(false);
  };

  const handleSaveSkill = (skill: SkillType) => {
    console.log('Saving skill:', skill);
    // Send to server via WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'save_skill', skill }));
    }
    setShowEditSkill(false);
  };

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />

      {/* Admin Menu Button */}
      {isAdmin && (
        <TouchableOpacity style={styles.adminButton} onPress={() => setShowAdminMenu(true)}>
          <Text style={styles.adminButtonText}>⚙️ ผู้ดูแล</Text>
        </TouchableOpacity>
      )}

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userInfoText}>{username}</Text>
        <Text style={[styles.roleText, role === 'admin' && styles.adminRoleText]}>
          {character.character_name} {role === 'admin' ? '(ผู้ดูแล)' : role === 'moderator' ? '(ผู้ควบคุม)' : '(ผู้เล่น)'}
        </Text>
      </View>

      {damages.map(d => (
        <DamageFloater
          key={d.id}
          damage={d.damage}
          isCritical={d.is_critical}
          x={d.x}
          y={d.y}
          onEnd={() => setDamages(prev => prev.filter(item => item.id !== d.id))}
        />
      ))}

      <View style={styles.leftControls}>
        <Joypad onMove={(x: number, y: number) => { facingDir.current = { x, y }; }} onStop={() => { }} />
      </View>

      <ActionPad onAttack={handleAttack} />

      {/* Admin Menu Modal */}
      <Modal visible={showAdminMenu} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.adminModal}>
            <View style={styles.adminModalHeader}>
              <Text style={styles.adminModalTitle}>เมนูผู้ดูแล</Text>
              <TouchableOpacity onPress={() => setShowAdminMenu(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.adminModalContent}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleCreateItem}>
                <Text style={styles.menuButtonText}>+ สร้างไอเทมใหม่</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowItemList(true)}>
                <Text style={styles.menuButtonText}>📋 ดู/แก้ไขไอเทม</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Maps</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleCreateMap}>
                <Text style={styles.menuButtonText}>+ สร้างแผนที่ใหม่</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowMapList(true)}>
                <Text style={styles.menuButtonText}>🗺️ ดู/แก้ไขแผนที่</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>NPCs</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleCreateNpc}>
                <Text style={styles.menuButtonText}>+ สร้าง NPC ใหม่</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowNpcList(true)}>
                <Text style={styles.menuButtonText}>👤 ดู/แก้ไข NPCs</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Skills</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleCreateSkill}>
                <Text style={styles.menuButtonText}>+ สร้างสกิลใหม่</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowSkillList(true)}>
                <Text style={styles.menuButtonText}>⚡ ดู/แก้ไขสกิล</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Account</Text>
              <TouchableOpacity style={[styles.menuButton, styles.logoutButton]} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modals */}
      <EditItemModal
        visible={showEditItem}
        onClose={() => setShowEditItem(false)}
        item={currentItem}
        onSave={handleSaveItem}
        mode={itemEditMode}
      />

      <EditMapModal
        visible={showEditMap}
        onClose={() => setShowEditMap(false)}
        map={currentMap}
        onSave={handleSaveMap}
        mode={mapEditMode}
      />

      <EditNpcModal
        visible={showEditNpc}
        onClose={() => setShowEditNpc(false)}
        npc={currentNpc}
        onSave={handleSaveNpc}
        mode={npcEditMode}
      />

      <EditSkillModal
        visible={showEditSkill}
        onClose={() => setShowEditSkill(false)}
        skill={currentSkill}
        onSave={handleSaveSkill}
        mode={skillEditMode}
      />

      {/* List Modals */}
      <ItemList
        visible={showItemList}
        onClose={() => setShowItemList(false)}
        onEditItem={handleEditItem}
        wsRef={wsRef}
      />

      <SkillList
        visible={showSkillList}
        onClose={() => setShowSkillList(false)}
        onEditSkill={handleEditSkill}
        wsRef={wsRef}
      />

      <NpcList
        visible={showNpcList}
        onClose={() => setShowNpcList(false)}
        onEditNpc={handleEditNpc}
        wsRef={wsRef}
      />

      <MapList
        visible={showMapList}
        onClose={() => setShowMapList(false)}
        onEditMap={handleEditMap}
        wsRef={wsRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  glView: { flex: 1 },
  leftControls: { position: 'absolute', bottom: 50, left: 50 },

  // Admin Button
  adminButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  adminButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // User Info
  userInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  userInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleText: {
    color: '#a0a0a0',
    fontSize: 12,
  },
  adminRoleText: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  adminModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  adminModalTitle: {
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
  adminModalContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a0a0a0',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuButton: {
    backgroundColor: '#2a2a4e',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
