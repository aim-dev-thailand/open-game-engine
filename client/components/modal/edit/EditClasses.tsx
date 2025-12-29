import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';

export type ClassType = {
    id?: number;
    name: string;
    description: string;
    min_level: number;
    quest_id?: number;

    // Base Stats
    str: number;
    dex: number;
    agi: number;
    vit: number;
    int: number;
    luk: number;

    // Combat Stats
    hp: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
    spd: number;
    movespeed: number;
    evasion: number;
    accuracy: number;
    crit_rate: number;
};

type EditClassesModalProps = {
    visible: boolean;
    onClose: () => void;
    classData?: ClassType;
    onSave: (data: ClassType) => void;
    mode: 'create' | 'edit';
};

export default function EditClassesModal({ visible, onClose, classData, onSave, mode }: EditClassesModalProps) {
    const [formData, setFormData] = useState<ClassType>({
        name: '',
        description: '',
        min_level: 1,
        str: 5, dex: 5, agi: 5, vit: 5, int: 5, luk: 5,
        hp: 100, atk: 10, def: 5, matk: 5, mdef: 5,
        spd: 5, movespeed: 2.0,
        evasion: 10, accuracy: 100, crit_rate: 2,
    });

    useEffect(() => {
        if (classData) {
            setFormData(classData);
        } else {
            setFormData({
                name: '',
                description: '',
                min_level: 1,
                str: 5, dex: 5, agi: 5, vit: 5, int: 5, luk: 5,
                hp: 100, atk: 10, def: 5, matk: 5, mdef: 5,
                spd: 5, movespeed: 2.0,
                evasion: 10, accuracy: 100, crit_rate: 2,
            });
        }
    }, [classData, visible]);

    const handleSave = () => {
        if (!formData.name.trim()) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่ออาชีพ');
            return;
        }
        onSave(formData);
        onClose();
    };

    const updateField = (key: keyof ClassType, value: string) => {
        if (key === 'name' || key === 'description') {
            setFormData(prev => ({ ...prev, [key]: value }));
        } else if (key === 'movespeed') {
            setFormData(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{mode === 'create' ? 'สร้างอาชีพใหม่' : 'แก้ไขอาชีพ'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContainer}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ข้อมูลทั่วไป</Text>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>ชื่ออาชีพ *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => updateField('name', text)}
                                placeholder="ชื่ออาชีพ"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>คำอธิบาย</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.description}
                                onChangeText={(text) => updateField('description', text)}
                                placeholder="คำอธิบาย"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Level ขั้นต่ำ</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.min_level.toString()}
                                onChangeText={(text) => updateField('min_level', text)}
                                keyboardType="numeric"
                                placeholder="1"
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ค่าสถานะพื้นฐาน (Base Stats)</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>STR (พละกำลัง)</Text>
                                <TextInput style={styles.input} value={formData.str.toString()} onChangeText={(t) => updateField('str', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>AGI (ความว่องไว)</Text>
                                <TextInput style={styles.input} value={formData.agi.toString()} onChangeText={(t) => updateField('agi', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>VIT (ความทนทาน)</Text>
                                <TextInput style={styles.input} value={formData.vit.toString()} onChangeText={(t) => updateField('vit', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>INT (พลังเวทย์)</Text>
                                <TextInput style={styles.input} value={formData.int.toString()} onChangeText={(t) => updateField('int', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>DEX (ความแม่นยำ)</Text>
                                <TextInput style={styles.input} value={formData.dex.toString()} onChangeText={(t) => updateField('dex', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>LUK (อัตราคริติคอล)</Text>
                                <TextInput style={styles.input} value={formData.luk.toString()} onChangeText={(t) => updateField('luk', t)} keyboardType="numeric" />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ค่าสถานะการต่อสู้ (Combat Stats)</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>HP สูงสุด</Text>
                                <TextInput style={styles.input} value={formData.hp.toString()} onChangeText={(t) => updateField('hp', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>พลังโจมตี (ATK)</Text>
                                <TextInput style={styles.input} value={formData.atk.toString()} onChangeText={(t) => updateField('atk', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>พลังป้องกัน (DEF)</Text>
                                <TextInput style={styles.input} value={formData.def.toString()} onChangeText={(t) => updateField('def', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>พลังโจมตีเวทย์ (MATK)</Text>
                                <TextInput style={styles.input} value={formData.matk.toString()} onChangeText={(t) => updateField('matk', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>พลังป้องกันเวทย์ (MDEF)</Text>
                                <TextInput style={styles.input} value={formData.mdef.toString()} onChangeText={(t) => updateField('mdef', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>ความเร็วโจมตี (SPD)</Text>
                                <TextInput style={styles.input} value={formData.spd.toString()} onChangeText={(t) => updateField('spd', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>ความเร็วเคลื่อนที่</Text>
                                <TextInput style={styles.input} value={formData.movespeed.toString()} onChangeText={(t) => updateField('movespeed', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>หลบหลีก (Evasion)</Text>
                                <TextInput style={styles.input} value={formData.evasion.toString()} onChangeText={(t) => updateField('evasion', t)} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>แม่นยำ (Accuracy)</Text>
                                <TextInput style={styles.input} value={formData.accuracy.toString()} onChangeText={(t) => updateField('accuracy', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>อัตราคริติคอล (Crit Rate)</Text>
                                <TextInput style={styles.input} value={formData.crit_rate.toString()} onChangeText={(t) => updateField('crit_rate', t)} keyboardType="numeric" />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>บันทึกอาชีพ</Text>
                        </TouchableOpacity>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center',
    },
    modalContainer: {
        width: '90%', maxHeight: '90%', backgroundColor: '#1a1a2e', borderRadius: 16, overflow: 'hidden',
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333',
    },
    title: {
        fontSize: 20, fontWeight: 'bold', color: '#fff',
    },
    closeButton: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#ff4757', justifyContent: 'center', alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff', fontSize: 18, fontWeight: 'bold',
    },
    scrollContainer: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14, color: '#a0a0a0', marginBottom: 8,
    },
    input: {
        backgroundColor: '#2a2a4e', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16,
    },
    textArea: {
        height: 80, textAlignVertical: 'top',
    },
    section: {
        marginBottom: 16, marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 18, fontWeight: 'bold', color: '#3b82f6',
    },
    saveButton: {
        backgroundColor: '#22c55e', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 16,
    },
    saveButtonText: {
        color: '#fff', fontSize: 16, fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row', justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
});
