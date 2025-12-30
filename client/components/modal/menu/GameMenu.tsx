import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';


type GameMenuProps = {
    visible: boolean;
    onClose: () => void;
    wsRef: React.RefObject<WebSocket | null>;
};

export default function GameMenu({ visible, onClose, wsRef }: GameMenuProps) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadMaps();
        }
    }, [visible]);

    const loadMaps = () => {
        setLoading(true);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'load_map' }));
        }
        // รอรับข้อมูลจาก WebSocket
        // ในการใช้งานจริงจะมีการรับข้อมูลจาก onmessage
        setLoading(false);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>เมนูทั้งหมด</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>


                    <ScrollView style={styles.modalContent}>
                        <View style={styles.mapCard}>
                            <View style={styles.mapHeader}>
                                <Text style={styles.mapName}>เมนูทั้งหมด</Text>
                            </View>
                            <View style={styles.mapDetails}>
                                <Text style={styles.mapDetailText}>
                                    📐 ขนาด:
                                </Text>
                                <Text style={styles.mapDetailText}>
                                    🧱 ไทล์:
                                </Text>
                                <Text style={styles.mapDetailText}>
                                    🚩 Spawn:
                                </Text>
                                <Text style={styles.mapDetailText}>
                                    👤 NPC:
                                </Text>
                                <Text style={styles.mapDetailText}>
                                    👾 มอนสเตอร์:
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => { }}
                            >
                                <Text style={styles.editButtonText}>แก้ไข</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
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
    modalContent: {
        padding: 16,
    },
    loadingContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 14,
    },
    emptyContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#a0a0a0',
        fontSize: 16,
    },
    mapCard: {
        backgroundColor: '#2a2a4e',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    mapName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    mapSize: {
        fontSize: 12,
        color: '#a0a0a0',
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    mapDescription: {
        fontSize: 14,
        color: '#a0a0a0',
        marginBottom: 8,
    },
    mapDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    mapDetailText: {
        fontSize: 12,
        color: '#a0a0a0',
        marginRight: 16,
    },
    mapFeatures: {
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    featureText: {
        fontSize: 12,
        color: '#a0a0a0',
        marginLeft: 8,
    },
    editButton: {
        backgroundColor: '#3b82f6',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
