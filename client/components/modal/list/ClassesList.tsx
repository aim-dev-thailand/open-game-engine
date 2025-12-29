import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { ClassType } from '../edit/EditClasses';

type ClassesListProps = {
    visible: boolean;
    onClose: () => void;
    onEditClass: (classData: ClassType) => void;
    wsRef: React.RefObject<WebSocket | null>;
};

export default function ClassesList({ visible, onClose, onEditClass, wsRef }: ClassesListProps) {
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadClasses();
        }
    }, [visible]);

    useEffect(() => {
        if (wsRef.current) {
            const originalOnMessage: any = wsRef.current.onmessage;
            wsRef.current.onmessage = (event) => {
                if (originalOnMessage) {
                    originalOnMessage(event);
                }
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'classes_loaded') {
                        setClasses(data.classes);
                        setLoading(false);
                    }
                } catch (e) {
                    console.error("Error parsing websocket message", e);
                }
            };
        }
    }, [wsRef.current]);

    const loadClasses = () => {
        setLoading(true);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'load_classes' }));
        }
        // Timeout fallback if no response/error - increased to 5s
        setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>รายการอาชีพ</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text style={styles.loadingText}>กำลังโหลด...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.modalContent}>
                            {classes.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>ไม่มีข้อมูลอาชีพ</Text>
                                </View>
                            ) : (
                                classes.map((cls, index) => (
                                    <View key={index} style={styles.itemCard}>
                                        <View style={styles.itemHeader}>
                                            <Text style={styles.itemName}>{cls.name} (Lv.{cls.min_level})</Text>
                                        </View>
                                        <Text style={styles.itemDescription} numberOfLines={2}>
                                            {cls.description}
                                        </Text>
                                        <View style={styles.itemDetails}>
                                            <Text style={styles.itemDetailText}>STR: {cls.str} | DEX: {cls.dex}</Text>
                                            <Text style={styles.itemDetailText}>VIT: {cls.vit} | INT: {cls.int}</Text>
                                            <Text style={styles.itemDetailText}>AGI: {cls.agi} | LUK: {cls.luk}</Text>
                                        </View>
                                        <View style={styles.itemDetails}>
                                            <Text style={styles.itemDetailText}>HP: {cls.hp} | ATK: {cls.atk}</Text>
                                            <Text style={styles.itemDetailText}>DEF: {cls.def} | MATK: {cls.matk}</Text>
                                            <Text style={styles.itemDetailText}>MDEF: {cls.mdef} | MoveSpeed: {cls.movespeed}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => onEditClass(cls)}
                                        >
                                            <Text style={styles.editButtonText}>แก้ไข</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center',
    },
    modal: {
        width: '90%', maxHeight: '80%', backgroundColor: '#1a1a2e', borderRadius: 16, overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333',
    },
    modalTitle: {
        fontSize: 20, fontWeight: 'bold', color: '#fff',
    },
    closeButton: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#ff4757', justifyContent: 'center', alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff', fontSize: 18, fontWeight: 'bold',
    },
    modalContent: {
        padding: 16,
    },
    loadingContainer: {
        padding: 40, justifyContent: 'center', alignItems: 'center',
    },
    loadingText: {
        color: '#fff', marginTop: 16, fontSize: 14,
    },
    emptyContainer: {
        padding: 40, justifyContent: 'center', alignItems: 'center',
    },
    emptyText: {
        color: '#a0a0a0', fontSize: 16,
    },
    itemCard: {
        backgroundColor: '#2a2a4e', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#3b82f6',
    },
    itemHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    itemName: {
        fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1,
    },
    itemDescription: {
        fontSize: 14, color: '#a0a0a0', marginBottom: 8,
    },
    itemDetails: {
        flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4, gap: 10
    },
    itemDetailText: {
        fontSize: 12, color: '#a0a0a0',
    },
    editButton: {
        backgroundColor: '#3b82f6', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 8
    },
    editButtonText: {
        color: '#fff', fontSize: 14, fontWeight: 'bold',
    },
});
