import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type ActionPadProps = {
    onAttack: () => void;
};

const ActionPad: React.FC<ActionPadProps> = ({ onAttack }) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.attackButton} onPress={onAttack}>
                <Text style={styles.icon}>⚔️</Text>
            </TouchableOpacity>
            {/* Skill Slots Placeholder */}
            <TouchableOpacity style={[styles.skillButton, { bottom: 50, right: 150 }]}>
                <Text style={styles.text}>S1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skillButton, { bottom: 100, right: 160 }]}>
                <Text style={styles.text}>S2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skillButton, { bottom: 150, right: 140 }]}>
                <Text style={styles.text}>S3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skillButton, { bottom: 160, right: 90 }]}>
                <Text style={styles.text}>S4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skillButton, { bottom: 140, right: 40 }]}>
                <Text style={styles.text}>S5</Text>
            </TouchableOpacity>
        </View>
    );
};

type Styles = {
    container: ViewStyle;
    attackButton: ViewStyle;
    icon: TextStyle;
    skillButton: ViewStyle;
    text: TextStyle;
};

const styles = StyleSheet.create<Styles>({
    container: {
        position: 'absolute',
        right: -10,
        bottom: -20,
        width: 150,
        height: 150
    },
    attackButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    icon: { fontSize: 32 },
    text: { color: '#fff' },
    skillButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'blue', position: 'absolute', justifyContent: 'center', alignItems: 'center' }
});

export default ActionPad;