import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three'; // If you see type errors, run: npm i --save-dev @types/three
import Joypad from './Joypad';
import ActionPad from './ActionPad';
import DamageFloater from './DamageFloater';
import { WS_API } from '@/env';


type GameScreenProps = {
  username: string;
  onLogout: () => void;
};

type DamageType = {
  id: number;
  x: number;
  y: number;
  damage: number;
  is_critical: boolean;
};

export default function GameScreen({ username, onLogout }: GameScreenProps) {
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const facingDir = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [damages, setDamages] = useState<DamageType[]>([]);

  useEffect(() => {
    wsRef.current = new WebSocket(WS_API);

    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({ type: 'login', username }));
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
          // setMyId(data.id); // Not used
      } else if (data.type === 'damage') {
        addDamage(
          Dimensions.get('window').width / 2,
          Dimensions.get('window').height / 2,
          100,
          true
        );
      }
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5;
    scene.add(cube);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);

    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();
  };

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      
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
        <Joypad onMove={(x: number, y: number) => { facingDir.current = { x, y }; }} onStop={() => {}} />
      </View>
      
      <ActionPad onAttack={handleAttack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glView: { flex: 1 },
  leftControls: { position: 'absolute', bottom: 50, left: 50 }
});