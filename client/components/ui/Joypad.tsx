import React, { useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';


type JoypadProps = {
    onMove: (x: number, y: number) => void;
    onStop: () => void;
};

const Joypad: React.FC<JoypadProps> = ({ onMove, onStop }) => {
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
            const x = Math.max(-1, Math.min(1, gestureState.dx / 50));
            const y = Math.max(-1, Math.min(1, gestureState.dy / 50));
            setPosition({ x: gestureState.dx, y: gestureState.dy });
            onMove(x, y);
        },
        onPanResponderRelease: () => {
            setPosition({ x: 0, y: 0 });
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
    container: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
    base: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute' },
    knob: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)' },
});

export default Joypad;