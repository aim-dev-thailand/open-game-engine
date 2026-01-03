import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Modal, Alert } from 'react-native';
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

type MapTileType = {
  id?: number;
  x: number;
  y: number;
  type: 'ground' | 'object-a' | 'object-b';
  walkable: boolean;
  sprite_id?: string;
  tileset_id?: number;
  tileX?: number;
  tileY?: number;
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
  const playerMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const mapMeshesRef = useRef<any[]>([]);
  const mapDataRef = useRef<MapType | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const facingDir = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetPosition = useRef<{ x: number; z: number }>({ x: 8, z: 8 }); // Target position for smooth movement

  // Multiplayer refs
  const otherPlayersRef = useRef<Map<string, { mesh: THREE.Mesh, target: { x: number, z: number }, lastUpdate: number }>>(new Map());
  const myPlayerIdRef = useRef<string>("");

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
    // Close existing WebSocket if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = new WebSocket(WS_API);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected in GameScreen');
      // Select character first
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && character.id) {
        wsRef.current.send(JSON.stringify({
          type: 'select_character',
          character_id: character.id
        }));
      }
      // Request map data on connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // If character has a map_id, we can request that specific map or rely on server
        // Currently server sends ALL maps on 'load_map'
        // But for optimization we might want to just load the current map
        // For now, we still call 'load_map' but handle the response differently
        wsRef.current.send(JSON.stringify({ type: 'load_map' }));
      }
    };

    wsRef!.current!.onmessage = (event) => {
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
          case 'maps_loaded': {
            // Load the map corresponding to player's map_id
            if (data.maps && data.maps.length > 0) {
              // Find the map that matches character.map_id or default to the first one
              const targetMapId = character.map_id || 1;
              const targetMap = data.maps.find((m: MapType) => m.id === targetMapId) || data.maps[0];

              console.log('Loading map:', targetMap.name, 'ID:', targetMap.id);
              mapDataRef.current = targetMap;
              setMapData(targetMap);
            } else {
              console.warn('No maps received from server');
            }
            break;
          }
          case 'map_loaded': {
            // Single map loaded
            if (data.map) {
              console.log('Map loaded:', data.map);
              mapDataRef.current = data.map;
              setMapData(data.map);
            }
            break;
          }
          case 'position_update': {
            // Update target position from server (will be smoothly interpolated)
            if (data.x !== undefined && data.y !== undefined) {
              const pId = data.player_id ? data.player_id.toString() : "";

              // If it's another player
              if (pId && pId !== myPlayerIdRef.current) {
                const others = otherPlayersRef.current;
                if (!others.has(pId)) {
                  // New player discovered! Create mesh
                  console.log('New player joined:', pId, data.sprite_id);
                  if (sceneRef.current) {
                    const spriteWidth = 32 / 48; // 0.667
                    const spriteHeight = 1;
                    const geometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
                    // Default material (white) or load texture
                    const material = new THREE.MeshBasicMaterial({
                      color: 0xffffff,
                      transparent: true,
                      side: THREE.DoubleSide
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.position.set(data.x, 0.5, data.y); // Set Y to 0.5 to be above ground

                    // Load texture if sprite_id available
                    if (data.sprite_id) {
                      const sId = Number(data.sprite_id) || 1;
                      const assetSource = CHARACTERS[sId] || CHARACTERS[1];
                      const asset = Asset.fromModule(assetSource);
                      const textureLoader = new TextureLoader();
                      // Use async load but we are in event handler
                      // TextureLoader.load is usually async in Three.js but in Expo might need asset download
                      // Ideally pre-load. For now just try load.
                      asset.downloadAsync().then(() => {
                        const texture = textureLoader.load(asset);
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        material.map = texture;
                        material.needsUpdate = true;
                      });
                    }

                    sceneRef.current.add(mesh);
                    others.set(pId, { mesh, target: { x: data.x, z: data.y }, lastUpdate: Date.now() });
                  }
                }

                // Update target
                const other = others.get(pId);
                if (other) {
                  other.target.x = data.x;
                  other.target.z = data.y;
                  other.lastUpdate = Date.now();
                }
                return; // Done handling other player
              }

              // Local player logic (existing)
              const currentMapData = mapDataRef.current;

              // Clamp position to map bounds if mapData exists
              let clampedX = data.x;
              let clampedZ = data.y;

              if (currentMapData) {
                // Clamp to map boundaries (0 to width-1, 0 to height-1)
                clampedX = Math.max(0, Math.min(currentMapData.width - 1, data.x));
                clampedZ = Math.max(0, Math.min(currentMapData.height - 1, data.y));
              }

              // Update target position for smooth interpolation
              targetPosition.current.x = clampedX;
              targetPosition.current.z = clampedZ;

              console.log('Target position updated:', { x: clampedX, z: clampedZ });
            } else {
              console.warn('Position update failed:', {
                x: data.x,
                y: data.y
              });
            }
            break;
          }
          case 'player_left': {
            const lId = data.player_id ? data.player_id.toString() : "";
            if (lId && otherPlayersRef.current.has(lId)) {
              console.log('Player left:', lId);
              const p = otherPlayersRef.current.get(lId);
              if (p && sceneRef.current) {
                sceneRef.current.remove(p.mesh);
                p.mesh.geometry.dispose();
                if (p.mesh.material instanceof THREE.Material) {
                  p.mesh.material.dispose();
                }
              }
              otherPlayersRef.current.delete(lId);
            }
            break;
          }
          case 'select_character_success':
            console.log('Character selected successfully:', data.character_id);
            if (data.player_id) {
              myPlayerIdRef.current = data.player_id.toString();
              console.log('My Player ID set to:', myPlayerIdRef.current);
            }
            break;
          case 'select_character_error':
            console.error('Character selection error:', data.message);
            Alert.alert('ข้อผิดพลาด', data.message);
            break;
          default:
            // Handle other message types
            console.log('Unhandled message type:', data);
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
  }, [character.id]);

  useEffect(() => {
    const moveInterval = setInterval(() => {
      const { x, y } = facingDir.current;
      if (x === 0 && y === 0) return;

      const now = Date.now();
      if (now - lastMoveTime.current > 100) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Normalize vector if needed, or just send raw values
          // Server expects x, y delta or absolute?
          // Usually 'move' implies delta or direction.
          // client_handler.rs handle_move adds x*speed, y*speed.
          // So passing direction vector is correct.
          const moveMsg = {
            type: 'move',
            player_id: character.id || username,
            x,
            y
          };
          console.log('Sending move:', moveMsg);
          wsRef.current.send(JSON.stringify(moveMsg));
          lastMoveTime.current = now;
        }
      }
    }, 50); // Check frequently

    return () => clearInterval(moveInterval);
  }, [username, character.id]);

  // Update player position when mapData is loaded
  useEffect(() => {
    console.log('Player position update useEffect triggered');
    console.log('playerMeshRef.current:', !!playerMeshRef.current);
    console.log('mapData:', mapData);
    console.log('character position:', { x: character.x, y: character.y });

    if (!playerMeshRef.current || !mapData) {
      console.warn('Player mesh or mapData not ready yet');
      return;
    }

    // Calculate correct starting position
    let startX = character.x !== undefined ? Number(character.x) : 8;
    let startZ = character.y !== undefined ? Number(character.y) : 8;

    // Fallback: If position is 0,0 (new char?), use map spawn
    if (startX === 0 && startZ === 0) {
      if (mapData.spawn_points && mapData.spawn_points.length > 0) {
        startX = mapData.spawn_points[0].x;
        startZ = mapData.spawn_points[0].y;
      } else {
        startX = Math.floor(mapData.width / 2);
        startZ = Math.floor(mapData.height / 2);
      }
    }

    console.log('Updating player position to:', { x: startX, z: startZ });

    // Update both current position and target position
    playerMeshRef.current.position.set(startX, 0.5, startZ);
    targetPosition.current.x = startX;
    targetPosition.current.z = startZ;

    // Also update camera to follow the new position
    if (cameraRef.current) {
      cameraRef.current.position.set(startX, 15, startZ);
    }
  }, [mapData, character.x, character.y]);

  // Update map tiles when mapData changes
  useEffect(() => {
    console.log('Map tiles useEffect triggered');
    console.log('sceneRef.current:', !!sceneRef.current);
    console.log('mapData:', mapData);

    if (!sceneRef.current || !mapData) {
      console.warn('Scene or mapData not ready yet');
      return;
    }

    console.log('Updating map tiles for mapData:', mapData.name);
    console.log('Total tiles to render:', mapData.tiles?.length || 0);

    // Clear old map meshes
    mapMeshesRef.current.forEach(mesh => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    mapMeshesRef.current = [];

    // Render new map tiles
    if (mapData.tiles && Array.isArray(mapData.tiles)) {
      console.log('Starting to render tiles...');
      const textureLoader = new TextureLoader();
      const tileSize = 1;
      let skippedTiles = 0;
      let renderedTiles = 0;

      mapData.tiles.forEach((tile: any, index: number) => {
        if (!tile.tileset_id || tile.tileX === undefined || tile.tileY === undefined) {
          skippedTiles++;
          if (index < 3) {
            console.log(`Skipping tile ${index}:`, tile);
          }
          return;
        }

        try {
          const tilesetSource = TILESETS[tile.tileset_id];
          if (!tilesetSource) return;

          const tileAsset = Asset.fromModule(tilesetSource);
          const tileTexture = textureLoader.load(tileAsset);
          tileTexture.magFilter = THREE.NearestFilter;
          tileTexture.minFilter = THREE.NearestFilter;

          const tilesetWidth = 512;
          const tilesetHeight = 512;
          const tilePixelSize = 32;

          const uLeft = (tile.tileX * tilePixelSize) / tilesetWidth;
          const uRight = ((tile.tileX + 1) * tilePixelSize) / tilesetWidth;
          const vBottom = 1 - ((tile.tileY + 1) * tilePixelSize) / tilesetHeight;
          const vTop = 1 - (tile.tileY * tilePixelSize) / tilesetHeight;

          const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
          const uvs = tileGeometry.attributes.uv;
          uvs.setXY(0, uLeft, vTop);
          uvs.setXY(1, uRight, vTop);
          uvs.setXY(2, uLeft, vBottom);
          uvs.setXY(3, uRight, vBottom);
          uvs.needsUpdate = true;

          const tileMaterial = new THREE.MeshBasicMaterial({
            map: tileTexture,
            transparent: true,
            side: THREE.DoubleSide
          });

          const tileMesh = new THREE.Mesh(tileGeometry, tileMaterial);
          tileMesh.position.set(tile.x * tileSize, 0, tile.y * tileSize);
          tileMesh.rotation.x = -Math.PI / 2;
          sceneRef.current?.add(tileMesh);
          mapMeshesRef.current.push(tileMesh);
          renderedTiles++;

          if (renderedTiles <= 3) {
            console.log(`Rendered tile ${renderedTiles}:`, {
              position: { x: tile.x, y: tile.y },
              tileset: tile.tileset_id,
              tileCoords: { x: tile.tileX, y: tile.tileY }
            });
          }
        } catch (e) {
          console.error('Error rendering tile:', tile, e);
        }
      });

      console.log(`Map tiles rendering complete: ${renderedTiles} rendered, ${skippedTiles} skipped`);
      console.log('Total meshes in scene:', mapMeshesRef.current.length);
    }
  }, [mapData]);

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

    const grid = new THREE.GridHelper(1000, 25, 0x444444, 0x111111);
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
      const charKeys = Object.keys(CHARACTERS);
      for (const item of charKeys) {
        const asset = Asset.fromModule(CHARACTERS[Number(item)]);
        await asset.downloadAsync();
        console.log('Sprite asset downloaded:', asset.localUri);
      }

      console.log('Loading tiles asset...', spriteId);
      const tileKeys = Object.keys(TILESETS);
      for (const item of tileKeys) {
        const asset = Asset.fromModule(TILESETS[Number(item)]);
        await asset.downloadAsync();
        console.log('Sprite tiles downloaded:', asset.localUri);
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

      // Set initial position from saved character position
      let startX = character.x !== undefined ? Number(character.x) : 8;
      let startZ = character.y !== undefined ? Number(character.y) : 8;

      // Fallback: If position is 0,0 (new char?), maybe use map spawn
      if (startX === 0 && startZ === 0 && mapData) {
        if (mapData.spawn_points && mapData.spawn_points.length > 0) {
          startX = mapData.spawn_points[0].x;
          startZ = mapData.spawn_points[0].y;
        } else {
          startX = Math.floor(mapData.width / 2);
          startZ = Math.floor(mapData.height / 2);
        }
      }

      console.log('Initial player position:', { x: startX, z: startZ });

      // Set both current and target position
      playerMesh.position.set(startX, 0.5, startZ);
      targetPosition.current.x = startX;
      targetPosition.current.z = startZ;

      // For top-down view, sprite should be parallel to ground and face up
      playerMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
      playerMesh.rotation.z = 0; // Face camera
      scene.add(playerMesh);
      playerMeshRef.current = playerMesh;
      console.log('Player mesh added to scene at:', { x: startX, z: startZ });

      // Render map tiles if mapData exists
      if (mapData && mapData.tiles && Array.isArray(mapData.tiles)) {
        console.log('Rendering map tiles:', mapData.tiles.length);
        const textureLoader = new TextureLoader();
        const tileSize = 1; // Size of each tile in 3D space

        for (const tile of mapData.tiles) {
          if (!tile.tileset_id || tile.tileX === undefined || tile.tileY === undefined) {
            continue; // Skip tiles without tileset info
          }

          try {
            const tilesetSource = TILESETS[tile.tileset_id];
            if (!tilesetSource) continue;

            const tileAsset = Asset.fromModule(tilesetSource);
            const tileTexture = textureLoader.load(tileAsset);
            tileTexture.magFilter = THREE.NearestFilter;
            tileTexture.minFilter = THREE.NearestFilter;

            // Calculate UV coordinates for the specific tile
            // Assuming 32x32 tiles in the tileset
            const tilesetWidth = 512; // Adjust based on actual tileset size
            const tilesetHeight = 512;
            const tilePixelSize = 32;

            const uLeft = (tile.tileX * tilePixelSize) / tilesetWidth;
            const uRight = ((tile.tileX + 1) * tilePixelSize) / tilesetWidth;
            const vBottom = 1 - ((tile.tileY + 1) * tilePixelSize) / tilesetHeight;
            const vTop = 1 - (tile.tileY * tilePixelSize) / tilesetHeight;

            // Create geometry with custom UVs
            const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
            const uvs = tileGeometry.attributes.uv;
            uvs.setXY(0, uLeft, vTop);     // TL
            uvs.setXY(1, uRight, vTop);    // TR
            uvs.setXY(2, uLeft, vBottom);  // BL
            uvs.setXY(3, uRight, vBottom); // BR
            uvs.needsUpdate = true;

            const tileMaterial = new THREE.MeshBasicMaterial({
              map: tileTexture,
              transparent: true,
              side: THREE.DoubleSide
            });

            const tileMesh = new THREE.Mesh(tileGeometry, tileMaterial);
            tileMesh.position.set(tile.x * tileSize, 0, tile.y * tileSize);
            tileMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
            scene.add(tileMesh);
            mapMeshesRef.current.push(tileMesh);
          } catch (e) {
            console.error('Error loading tile:', tile, e);
          }
        }
        console.log('Map tiles rendered:', mapMeshesRef.current.length);
      }
    } catch (e) {
      console.error('Error loading sprite:', e);
    }

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);

    // Set camera for top-down view (directly above the starting position)
    let camStartX = 8;
    let camStartZ = 8;

    if (mapData) {
      if (mapData.spawn_points && mapData.spawn_points.length > 0) {
        // Use first spawn point if available
        camStartX = mapData.spawn_points[0].x;
        camStartZ = mapData.spawn_points[0].y;
      } else {
        // Use center of map if no spawn points
        camStartX = Math.floor(mapData.width / 2);
        camStartZ = Math.floor(mapData.height / 2);
      }
    }

    // Set both current and target position
    // camera.position.set(camStartX, 15, camStartZ); // Directly above player

    // Fix: Set fixed rotation instead of using lookAt to avoid gimbal lock/rotation issues
    camera.rotation.order = 'YXZ';
    camera.rotation.x = -Math.PI / 2;
    camera.rotation.y = 0;
    camera.rotation.z = 0;

    camera.position.set(camStartX, 15, camStartZ);
    cameraRef.current = camera; // Store camera reference for tracking player

    let lastRow = 0; // 0: Down, 1: Left, 2: Right, 3: Up

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Smooth position interpolation (lerp)
      if (playerMeshRef.current) {
        const currentX = playerMeshRef.current.position.x;
        const currentZ = playerMeshRef.current.position.z;
        const targetX = targetPosition.current.x;
        const targetZ = targetPosition.current.z;

        // Lerp factor (0.15 = smooth, higher = faster)
        const lerpFactor = 0.2;

        // Interpolate position
        playerMeshRef.current.position.x += (targetX - currentX) * lerpFactor;
        playerMeshRef.current.position.z += (targetZ - currentZ) * lerpFactor;

        // Render other players
        otherPlayersRef.current.forEach(p => {
          const px = p.mesh.position.x;
          const pz = p.mesh.position.z;
          const tx = p.target.x;
          const tz = p.target.z;

          p.mesh.position.x += (tx - px) * lerpFactor;
          p.mesh.position.z += (tz - pz) * lerpFactor;
        });

        // Update camera to follow player smoothly (position only, no rotation)
        if (cameraRef.current) {
          const cameraHeight = 15;
          const camTargetX = playerMeshRef.current.position.x;
          const camTargetZ = playerMeshRef.current.position.z;

          // Smoothly move camera position
          cameraRef.current.position.x += (camTargetX - cameraRef.current.position.x) * lerpFactor;
          cameraRef.current.position.z += (camTargetZ - cameraRef.current.position.z) * lerpFactor;
          cameraRef.current.position.y = cameraHeight;

          // Keep camera looking straight down (no rotation/angle change)
          // Removed lookAt to prevent rotation
          // cameraRef.current.lookAt(cameraRef.current.position.x, 0, cameraRef.current.position.z);
        }
      }

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
          row = y > 0 ? 0 : 3; // Down : Up
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

      {mapData &&
        <View style={styles.mapInfo}>
          <Text style={styles.mapInfoText}>{mapData.name}</Text>
        </View>
      }

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
    width: 180,
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

  // Map Info
  mapInfo: {
    position: 'absolute',
    top: 12,
    left: 200,
    backgroundColor: 'white',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  mapInfoText: {
    color: 'black',
    fontSize: 14,
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
