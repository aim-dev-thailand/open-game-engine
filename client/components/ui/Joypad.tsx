import React, { useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';


type JoypadProps = {
    onMove: (x: number, y: number) => void;
    onStop: () => void;
};

const Joypad: React.FC<JoypadProps> = ({ onMove, onStop }) => {
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (_evt, gestureState) => {
            // เก็บตำแหน่งเริ่มต้นเมื่อผู้ใช้กด
            setStartPosition({ x: gestureState.x0, y: gestureState.y0 });
            setPosition({ x: 0, y: 0 });
        },
        onPanResponderMove: (_evt, gestureState) => {
            if (!startPosition) return;
            
            // คำนวณระยะทางจากจุดเริ่มต้น (ใช้ dx, dy จาก gestureState)
            const dx = gestureState.dx;
            const dy = gestureState.dy;
            
            // คำนวณค่า normalized (-1 ถึง 1) สำหรับการส่งไปยัง server
            const maxDistance = 50;
            const normalizedX = Math.max(-1, Math.min(1, dx / maxDistance));
            const normalizedY = Math.max(-1, Math.min(1, dy / maxDistance));
            
            // จำกัดระยะทางการแสดงผลของ knob
            const maxKnobDistance = 250;
            const clampedDx = Math.max(-maxKnobDistance, Math.min(maxKnobDistance, dx));
            const clampedDy = Math.max(-maxKnobDistance, Math.min(maxKnobDistance, dy));
            
            setPosition({ x: clampedDx, y: clampedDy });
            onMove(normalizedX, normalizedY);
        },
        onPanResponderRelease: () => {
            setPosition({ x: 0, y: 0 });
            setStartPosition(null);
            onStop();
        },
        onPanResponderTerminate: () => {
            setPosition({ x: 0, y: 0 });
            setStartPosition(null);
            onStop();
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.base} />
            <View
                style={[styles.knob, { transform: [{ translateX: position.x }, { translateY: position.y }] }]}
                {...panResponder.panHandlers}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
    base: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute' },
    knob: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)' },
});

export default Joypad;