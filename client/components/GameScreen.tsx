import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Modal, Alert } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import { Asset } from 'expo-asset';
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

  const lastMoveTime = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // WebSocket setup
  useEffect(() => {
    wsRef.current = new WebSocket(WS_API);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected in GameScreen');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type);

        switch (data.type) {
          case 'save_map_success':
            console.log('Map saved successfully:', data.map_id);
            Alert.alert('สำเร็จ', 'บันทึกแผนที่สำเร็จ!');
            break;
          case 'save_map_error':
            console.error('Map save error:', data.message);
            Alert.alert('ข้อผิดพลาด', data.message);
            break;
          case 'save_item_success':
            console.log('Item saved successfully:', data.item_id);
            Alert.alert('สำเร็จ', 'บันทึกไอเทมสำเร็จ!');
            break;
          case 'save_item_error':
            console.error('Item save error:', data.message);
            Alert.alert('ข้อผิดพลาด', data.message);
            break;
          case 'save_npc_success':
            console.log('NPC saved successfully:', data.npc_id);
            Alert.alert('สำเร็จ', 'บันทึก NPC สำเร็จ!');
            break;
          case 'save_npc_error':
            console.error('NPC save error:', data.message);
            Alert.alert('ข้อผิดพลาด', data.message);
            break;
          case 'save_skill_success':
            console.log('Skill saved successfully:', data.skill_id);
            Alert.alert('สำเร็จ', 'บันทึกสกิลสำเร็จ!');
            break;
          case 'save_skill_error':
            console.error('Skill save error:', data.message);
            Alert.alert('ข้อผิดพลาด', data.message);
            break;
          default:
            // Handle other message types
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const moveInterval = setInterval(() => {
      const { x, y } = facingDir.current;
      if (x === 0 && y === 0) return;

      const now = Date.now();
      if (now - lastMoveTime.current > 100) {
        if (wsRef.current) {
          // Normalize vector if needed, or just send raw values 
          // Server expects x, y delta or absolute? 
          // Usually 'move' implies delta or direction. 
          // client_handler.rs handle_move adds x*speed, y*speed.
          // So passing direction vector is correct.
          wsRef.current.send(JSON.stringify({ type: 'move', x, y }));
          lastMoveTime.current = now;
        }
      }
    }, 50); // Check frequently

    return () => clearInterval(moveInterval);
  }, []);

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
    console.log('onContextCreate: started');
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
    const spriteAssetSource = CHARACTERS[spriteId] || CHARACTERS[1];

    // Sprite sheet: 128x192 pixels, 4x4 grid
    // Each frame: 32x48 pixels (aspect ratio 2:3)
    const spriteWidth = 32 / 48; // 0.667
    const spriteHeight = 1;
    const geometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);

    try {
      console.log('Loading sprite asset...', spriteId);
      const keys = Object.keys(CHARACTERS);
      for (const item of keys) {
        const asset = Asset.fromModule(CHARACTERS[Number(item)]);
        await asset.downloadAsync();
        console.log('Sprite asset downloaded:', asset.localUri);
      }

      const charAsset = Asset.fromModule(spriteAssetSource);
      const textureLoader = new TextureLoader();
      const texture = textureLoader.load(charAsset);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });

      const playerMesh = new THREE.Mesh(geometry, material);
      playerMesh.position.y = 0.5;
      playerMesh.rotation.x = -Math.PI / 4;
      scene.add(playerMesh);
      console.log('Player mesh added to scene');
    } catch (e) {
      console.error('Error loading sprite:', e);
    }

    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);

    let lastRow = 0; // 0: Down, 1: Left, 2: Right, 3: Up

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Animation Logic
      const { x, y } = facingDir.current;
      const isMoving = x !== 0 || y !== 0;

      // Determine Row
      let row = lastRow;
      if (isMoving) {
        if (Math.abs(x) > Math.abs(y)) {
          // Horizontal
          row = x > 0 ? 2 : 1; // Right : Left
        } else {
          // Vertical
          row = y > 0 ? 0 : 3; // Down (y>0 in joypad usually means down visually on screen? Joypad.tsx: dy. usually down is +dy in RN panresponder) -> User says "Down -> Row 0".
          // Verify Joypad: dy positive is down on screen.
          // Wait, server map: y+ might be up or down?
          // Usually 3D world: x, z. 
          // Let's assume standard Joypad: +y is down. "Drag joypad down" -> +y.
          // User: "Drag down -> Show Row 0".
        }
        lastRow = row;
      }

      // Calculate Frame
      // Loop interaction: 0, 1, 2, 3
      const frame = isMoving ? Math.floor(Date.now() / 200) % 4 : 0;

      // Update UVs
      // Row 0 (Top in image, High V) -> V: 0.75 - 1.0
      // Row 1 -> V: 0.50 - 0.75
      // Row 2 -> V: 0.25 - 0.50
      // Row 3 (Bottom in image, Low V) -> V: 0.0 - 0.25

      const colWidth = 0.25;
      const rowHeight = 0.25;

      const uLeft = frame * colWidth;
      const uRight = (frame + 1) * colWidth;

      // V is inverted relative to image rows usually (0 at bottom)
      // Row 0 (Top) -> vBottom = 0.75, vTop = 1.0
      // Row k -> vBottom = 1 - (k+1)*0.25, vTop = 1 - k*0.25

      const vTop = 1 - (row * rowHeight);
      const vBottom = 1 - ((row + 1) * rowHeight);

      const uvs = geometry.attributes.uv;
      // 0: (0, 1) -> TL
      // 1: (1, 1) -> TR
      // 2: (0, 0) -> BL
      // 3: (1, 0) -> BR

      uvs.setXY(0, uLeft, vTop);     // TL
      uvs.setXY(1, uRight, vTop);    // TR
      uvs.setXY(2, uLeft, vBottom);  // BL
      uvs.setXY(3, uRight, vBottom); // BR
      uvs.needsUpdate = true;

      // Camera Follow Player?
      // Currently scene is static grid?
      // Player mesh is at 0,0,0 initially?
      // If we move character via server updates, we need to update playerMesh position too?
      // But server updates mapData? 
      // wsRef.current onmessage 'init' or 'update'? 
      // Currently GameScreen only handles 'init' map.
      // We likely need 'player_update' handling later, but for now just implementing the CLIENT SIDE animation loop/request.
      // Wait, if playerMesh doesn't move on screen, it looks weird walking in place?
      // But user asked for "Joypad... animations".
      // Assuming map rendering handles position updates or camera moves?
      // user request: "Make it walk... reference movement from image... loop animation"

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
      setShowMapList(false);
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
          {character.username}:{character.user_id} {role === 'admin' ? '(ผู้ดูแล)' : role === 'moderator' ? '(ผู้ควบคุม)' : '(ผู้เล่น)'}
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
        <Joypad
          onMove={(x: number, y: number) => { facingDir.current = { x, y }; }}
          onStop={() => { facingDir.current = { x: 0, y: 0 }; }}
        />
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
