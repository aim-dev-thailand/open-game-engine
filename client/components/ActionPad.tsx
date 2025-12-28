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
            <View style={[styles.skillButton, { top: 10, right: 10 }]}><Text>S1</Text></View>
            <View style={[styles.skillButton, { bottom: 10, left: 10 }]}><Text>S2</Text></View>
        </View>
    );
};

type Styles = {
    container: ViewStyle;
    attackButton: ViewStyle;
    icon: TextStyle;
    skillButton: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
    container: { position: 'absolute', right: 40, bottom: 50, width: 150, height: 150 },
    attackButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    icon: { fontSize: 32 },
    skillButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'blue', position: 'absolute', justifyContent: 'center', alignItems: 'center' }
});

export default ActionPad;