import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';

type DamageFloaterProps = {
    damage: number | string;
    isCritical: boolean;
    x: number;
    y: number;
    onEnd?: () => void;
};

const DamageFloater: React.FC<DamageFloaterProps> = ({ damage, isCritical, x, y, onEnd }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: -80, duration: 1000, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]).start(onEnd);
    }, [fadeAnim, translateY, onEnd]);

    return (
        <Animated.View style={[styles.container, { left: x, top: y, opacity: fadeAnim, transform: [{ translateY }] }]}>
            {isCritical && <Text style={[styles.text, styles.crit]}>CRITICAL!</Text>}
            <Text style={[styles.text, isCritical ? styles.critDmg : styles.normDmg]}>{damage}</Text>
        </Animated.View>
    );
};


const styles = StyleSheet.create({
    container: { position: 'absolute' },
    text: { fontWeight: 'bold', textAlign: 'center' },
    crit: { fontSize: 20, color: 'gold' },
    critDmg: { fontSize: 36, color: 'red' },
    normDmg: { fontSize: 24, color: '#ffcccc' }
});
export default DamageFloater;