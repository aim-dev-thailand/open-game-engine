import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Image } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from "react";
import { WS_API } from "@/env";
import { CHARACTERS } from "@/assets/characters";

interface CreateCharacterProps {
    username: string;
    onCharacterCreated: () => void;
    onBackToCharacterList: () => void;
}

interface ClassData {
    id: number;
    name: string;
    description: string;
    sprite: string;
    str: number;
    dex: number;
    agi: number;
    vit: number;
    int: number;
    luk: number;
    hp: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
}

export default function CreateCharacter({ username, onCharacterCreated, onBackToCharacterList }: CreateCharacterProps) {
    const [characterName, setCharacterName] = useState("");
    const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    useEffect(() => {
        // เชื่อมต่อ WebSocket และดึงข้อมูล classes
        wsRef.current = new WebSocket(WS_API);

        wsRef.current.onopen = () => {
            console.log("WebSocket connected for character creation");
            // ขอข้อมูล classes จาก server
            wsRef.current?.send(JSON.stringify({
                type: "load_classes"
            }));
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === "classes_data") {
                setClasses(data.classes || []);
                setIsLoading(false);
                // ตั้งค่า default เป็น "นักพจญภัย"
                const adventurerClass = data.classes.find((c: ClassData) =>
                    c.name === "นักพจญภัย" || c.name.includes("นักพจญ")
                );
                if (adventurerClass) {
                    setSelectedClass(adventurerClass);
                }
            } else if (data.type === "create_character_success") {
                setIsCreating(false);
                onCharacterCreated();
            } else if (data.type === "create_character_error") {
                setIsCreating(false);
                setError(data.message || "เกิดข้อผิดพลาดในการสร้างตัวละคร");
            }
        };

        wsRef.current.onerror = () => {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsLoading(false);
            setIsCreating(false);
        };

        return () => {
            wsRef.current?.close();
        };
    }, [onCharacterCreated]);

    const handleCreateCharacter = () => {
        // Validation
        if (!characterName.trim()) {
            setError("กรุณากรอกชื่อตัวละคร");
            return;
        }

        if (characterName.length < 3) {
            setError("ชื่อตัวละครต้องมีอย่างน้อย 3 ตัวอักษร");
            return;
        }

        if (!selectedClass) {
            setError("กรุณาเลือกอาชีพ");
            return;
        }

        setError("");
        setIsCreating(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "create_character",
                username: username,
                character_name: characterName.trim(),
                class_id: selectedClass.id
            }));
        } else {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                <ActivityIndicator size="large" color="#45C4F0" />
                <Text style={[styles.loadingText, isLandscape && styles.loadingTextLandscape]}>กำลังโหลดข้อมูลอาชีพ...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={[styles.scrollContainer, isLandscape && styles.scrollContainerLandscape]}>
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                {/* Create Character Box with Gradient */}
                <View style={[styles.createBoxShadow, isLandscape && styles.createBoxShadowLandscape]}>
                    <LinearGradient
                        colors={['#1b32ffff', '#FF6B3D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.createBoxOuter, isLandscape && styles.createBoxOuterLandscape]}
                    >
                        <View style={[styles.createBoxInner, isLandscape && styles.createBoxInnerLandscape]}>
                            <Text style={[styles.title, isLandscape && styles.titleLandscape]}>สร้างตัวละคร</Text>
                            <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>ผู้เล่น: {username}</Text>

                            {error ? <Text style={[styles.errorText, isLandscape && styles.errorTextLandscape]}>{error}</Text> : null}

                            <TextInput
                                placeholder="ชื่อตัวละคร"
                                value={characterName}
                                onChangeText={(text) => {
                                    setCharacterName(text);
                                    setError("");
                                }}
                                style={[styles.input, isLandscape && styles.inputLandscape]}
                                placeholderTextColor="#ddd"
                                autoCapitalize="none"
                                maxLength={20}
                            />

                            <View style={{ display: 'flex', alignItems: 'center', flex: 2, flexDirection: 'row' }}>
                                <View style={{ display: 'flex', alignItems: 'center' }}>
                                    <View style={{ display: 'flex', alignItems: 'center' }}>
                                        <Text style={[styles.label, isLandscape && styles.labelLandscape]}>เลือกอาชีพ : นักพจญภัย</Text>
                                    </View>

                                    <ScrollView
                                        style={[styles.classListContainer, isLandscape && styles.classListContainerLandscape]}
                                        contentContainerStyle={styles.classListContent}
                                    >
                                        {classes.map((classData) => (
                                            <TouchableOpacity
                                                key={classData.id}
                                                style={[
                                                    styles.classCard,
                                                    isLandscape && styles.classCardLandscape,
                                                    selectedClass?.id === classData.id && styles.classCardSelected
                                                ]}
                                                onPress={() => setSelectedClass(classData)}
                                            >
                                                <Text style={[styles.className, isLandscape && styles.classNameLandscape]}>{classData.name}</Text>
                                                <Text style={[styles.classDescription, isLandscape && styles.classDescriptionLandscape]}>{classData.description}</Text>
                                                <View style={styles.statsContainer}>
                                                    <Text style={[styles.statsText, isLandscape && styles.statsTextLandscape]}>HP: {classData.hp} | ATK: {classData.atk} | DEF: {classData.def}</Text>
                                                    <Text style={[styles.statsText, isLandscape && styles.statsTextLandscape]}>STR: {classData.str} | DEX: {classData.dex} | AGI: {classData.agi}</Text>
                                                    <Text style={[styles.statsText, isLandscape && styles.statsTextLandscape]}>VIT: {classData.vit} | INT: {classData.int} | LUK: {classData.luk}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View>
                                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 8, paddingLeft: 48 }}>
                                        <View style={{ width: 64, height: 100, overflow: 'hidden', borderColor: 'black', borderWidth: 1 }}>
                                            <Image
                                                source={CHARACTERS[selectedClass?.sprite ? Number(selectedClass?.sprite) : 1] || CHARACTERS[1]}
                                                resizeMode="stretch"
                                                style={{ width: '400%', height: '400%' }}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                                        <TouchableOpacity
                                            style={[styles.createButton, isCreating && styles.createButtonDisabled, isLandscape && styles.createButtonLandscape]}
                                            onPress={handleCreateCharacter}
                                            disabled={isCreating}
                                        >
                                            <Text style={[styles.createButtonText, isLandscape && styles.createButtonTextLandscape]}>
                                                {isCreating ? "Loading..." : "เลือกอาชีพ"}
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={{ width: 10 }} />
                                        <TouchableOpacity
                                            style={[styles.createButton, isCreating && styles.createButtonDisabled, isLandscape && styles.createButtonLandscape, { backgroundColor: '#ff0000' }]}
                                            onPress={onBackToCharacterList}
                                            disabled={isCreating}
                                        >
                                            <Text style={[styles.createButtonText, isLandscape && styles.createButtonTextLandscape]}>
                                                ย้อนกลับ
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: "#1a1a2e",
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    loadingText: {
        color: "#fff",
        marginTop: 20,
        fontSize: 16,
    },
    createBoxShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 20,
        borderRadius: 40,
    },
    createBoxOuter: {
        borderRadius: 40,
        padding: 8,
    },
    createBoxInner: {
        backgroundColor: '#000',
        borderRadius: 32,
        padding: 30,
        paddingVertical: 40,
        alignItems: 'center',
        minWidth: 340,
        maxWidth: 400,
    },
    title: {
        fontSize: 36,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        color: '#fff',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#8B5A3C',
        color: 'white',
        padding: 14,
        width: 280,
        marginBottom: 20,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#6B4423',
    },
    label: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    classListContainer: {
        maxHeight: 300,
        width: '100%',
        marginBottom: 20,
    },
    classListContent: {
        paddingHorizontal: 20,
    },
    classCard: {
        backgroundColor: '#6B4423',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#8B5A3C',
    },
    classCardSelected: {
        borderColor: '#45C4F0',
        borderWidth: 3,
        backgroundColor: '#8B5A3C',
    },
    className: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    classDescription: {
        fontSize: 12,
        color: '#ddd',
        marginBottom: 8,
    },
    statsContainer: {
        marginTop: 5,
    },
    statsText: {
        fontSize: 11,
        color: '#FFE4B5',
        marginBottom: 2,
    },
    errorText: {
        color: '#FF0000',
        fontSize: 13,
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        width: 280,
    },
    createButton: {
        backgroundColor: '#45C4F0',
        paddingVertical: 14,
        paddingHorizontal: 60,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    createButtonDisabled: {
        backgroundColor: '#6b7280',
        opacity: 0.6,
    },
    backButton: {
        backgroundColor: 'red',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
        width: 200,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    // Landscape styles
    scrollContainerLandscape: {
        justifyContent: 'center',
    },
    containerLandscape: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    loadingTextLandscape: {
        fontSize: 13,
        marginTop: 12,
    },
    createBoxShadowLandscape: {
        borderRadius: 25,
    },
    createBoxOuterLandscape: {
        borderRadius: 25,
        padding: 5,
    },
    createBoxInnerLandscape: {
        borderRadius: 20,
        padding: 20,
        paddingVertical: 15,
        minWidth: 500,
        maxWidth: 650,
    },
    titleLandscape: {
        fontSize: 24,
        marginBottom: 6,
    },
    subtitleLandscape: {
        fontSize: 11,
        marginBottom: 12,
    },
    inputLandscape: {
        padding: 10,
        width: 320,
        marginBottom: 12,
        fontSize: 12,
        borderRadius: 10,
    },
    labelLandscape: {
        fontSize: 13,
        marginBottom: 6,
    },
    classListContainerLandscape: {
        maxHeight: 150,
    },
    classCardLandscape: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    classNameLandscape: {
        fontSize: 15,
        marginBottom: 3,
    },
    classDescriptionLandscape: {
        fontSize: 10,
        marginBottom: 5,
    },
    statsTextLandscape: {
        fontSize: 9,
    },
    errorTextLandscape: {
        fontSize: 10,
        marginBottom: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        width: 320,
    },
    createButtonLandscape: {
        paddingHorizontal: 50,
        borderRadius: 10,
        marginTop: 6,
    },
    createButtonTextLandscape: {
        fontSize: 13,
    },
    backButtonLandscape: {
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 15,
    },
    backButtonTextLandscape: {
        fontSize: 12,
    },
});
