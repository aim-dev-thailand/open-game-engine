import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Image } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from "react";
import { WS_API } from "@/env";
import { CharacterData } from "@/model/character";
import { CHARACTERS } from "@/assets/characters";

interface CharacterListProps {
    username: string;
    onSelectCharacter: (character: CharacterData) => void;
    onCreateNewCharacter: () => void;
    onLogout: () => void;
}

export default function CharacterList({ username, onSelectCharacter, onCreateNewCharacter, onLogout }: CharacterListProps) {
    const [characters, setCharacters] = useState<CharacterData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const wsRef = useRef<WebSocket | null>(null);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    useEffect(() => {
        // เชื่อมต่อ WebSocket และดึงข้อมูลตัวละคร
        wsRef.current = new WebSocket(WS_API);

        wsRef.current.onopen = () => {
            console.log("WebSocket connected for character list");
            // ขอข้อมูลตัวละครจาก server
            wsRef.current?.send(JSON.stringify({
                type: "load_characters",
                username: username
            }));
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === "characters_data") {
                setCharacters(data.characters || []);
                setIsLoading(false);
            } else if (data.type === "load_characters_error") {
                setError(data.message || "เกิดข้อผิดพลาดในการโหลดตัวละคร");
                setIsLoading(false);
            }
        };

        wsRef.current.onerror = () => {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsLoading(false);
        };

        return () => {
            wsRef.current?.close();
        };
    }, [username]);

    if (isLoading) {
        return (
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                <ActivityIndicator size="large" color="#45C4F0" />
                <Text style={[styles.loadingText, isLandscape && styles.loadingTextLandscape]}>กำลังโหลดตัวละคร...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={[styles.scrollContainer, isLandscape && styles.scrollContainerLandscape]}>
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                {/* Character List Box with Gradient */}
                <View style={[styles.listBoxShadow, isLandscape && styles.listBoxShadowLandscape]}>
                    <LinearGradient
                        colors={['#1b32ffff', '#FF6B3D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.listBoxOuter, isLandscape && styles.listBoxOuterLandscape]}
                    >
                        <View style={[styles.listBoxInner, isLandscape && styles.listBoxInnerLandscape]}>
                            <Text style={[styles.title, isLandscape && styles.titleLandscape]}>เลือกตัวละคร</Text>
                            <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>ผู้เล่น: {username}</Text>

                            {error ? <Text style={[styles.errorText, isLandscape && styles.errorTextLandscape]}>{error}</Text> : null}

                            {characters.length === 0 ? (
                                <View style={[styles.emptyContainer, isLandscape && styles.emptyContainerLandscape]}>
                                    <Text style={[styles.emptyText, isLandscape && styles.emptyTextLandscape]}>ยังไม่มีตัวละคร</Text>
                                    <Text style={[styles.emptySubText, isLandscape && styles.emptySubTextLandscape]}>กดปุ่มด้านล่างเพื่อสร้างตัวละครใหม่</Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={[styles.characterListContainer, isLandscape && styles.characterListContainerLandscape]}
                                    contentContainerStyle={styles.characterListContent}
                                >
                                    {characters.map((character) => (
                                        <TouchableOpacity
                                            key={character.id}
                                            style={[styles.characterCard, isLandscape && styles.characterCardLandscape]}
                                            onPress={() => onSelectCharacter(character)}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 10 }}>
                                                <View style={{ width: '20%', alignItems: 'center' }}>
                                                    <View style={{ width: 64, height: 100, overflow: 'hidden', borderColor: 'black', borderWidth: 1 }}>
                                                        <Image
                                                            source={CHARACTERS[character?.sprite_id ? Number(character?.sprite_id) : 2] || CHARACTERS[1]}
                                                            resizeMode="stretch"
                                                            style={{ width: '400%', height: '400%' }}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={{ width: '75%' }}>
                                                    <View style={styles.characterHeader}>
                                                        <Text style={[styles.characterName, isLandscape && styles.characterNameLandscape]}>{character.character_name}</Text>
                                                        <Text style={[styles.characterLevel, isLandscape && styles.characterLevelLandscape]}>Lv. {character.level}</Text>
                                                    </View>
                                                    <Text style={[styles.characterClass, isLandscape && styles.characterClassLandscape]}>{character.class_name}</Text>
                                                    <View style={[styles.hpBar, isLandscape && styles.hpBarLandscape]}>
                                                        <View style={[styles.hpBarFill, { width: `${(character.hp / character.max_hp) * 100}%` }]} />
                                                        <Text style={[styles.hpText, isLandscape && styles.hpTextLandscape]}>HP: {character.hp}/{character.max_hp}</Text>
                                                    </View>
                                                    <View style={styles.statsContainer}>
                                                        <Text style={[styles.statsText, isLandscape && styles.statsTextLandscape]}>STR: {character.str} | DEX: {character.dex} | AGI: {character.agi}</Text>
                                                        <Text style={[styles.statsText, isLandscape && styles.statsTextLandscape]}>VIT: {character.vit} | INT: {character.int} | LUK: {character.luk}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={{ width: '100%', flexDirection: 'row', gap: '6%', height: 46, paddingHorizontal: 10, marginTop: -20, marginBottom: 10 }}>
                                <TouchableOpacity
                                    style={[styles.createButton]}
                                    onPress={onCreateNewCharacter}
                                >
                                    <Text style={[styles.createButtonText]}>สร้างตัวละครใหม่</Text>
                                </TouchableOpacity>

                                {/* Logout Button */}
                                <TouchableOpacity style={[styles.logoutButton]} onPress={onLogout}>
                                    <Text style={[styles.logoutButtonText]}>ออกจากระบบ</Text>
                                </TouchableOpacity>
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
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    loadingText: {
        color: "#fff",
        marginTop: 10,
        fontSize: 16,
    },
    listBoxShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 20,
        borderRadius: 40,
    },
    listBoxOuter: {
        borderRadius: 40,
        padding: 8,
    },
    listBoxInner: {
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
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    emptySubText: {
        fontSize: 14,
        color: '#ddd',
        textAlign: 'center',
    },
    characterListContainer: {
        maxHeight: 350,
        width: '100%',
        marginBottom: 20,
    },
    characterListContent: {
        paddingHorizontal: 10,
    },
    characterCard: {
        backgroundColor: '#6B4423',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#8B5A3C',
    },
    characterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    characterName: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
    },
    characterLevel: {
        fontSize: 16,
        color: '#FFD700',
        fontWeight: 'bold',
    },
    characterClass: {
        fontSize: 14,
        color: '#D4A574',
        marginBottom: 10,
    },
    hpBar: {
        width: '100%',
        height: 20,
        backgroundColor: '#4a2f1f',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
        position: 'relative',
    },
    hpBarFill: {
        height: '100%',
        backgroundColor: '#FF3B3B',
        borderRadius: 10,
    },
    hpText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
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
        paddingVertical: 8,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
        width: '47%',
        display: 'flex',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    logoutButton: {
        backgroundColor: '#FF3B3B',
        paddingVertical: 8,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
        width: '47%',
        display: 'flex',
        alignItems: 'center',
    },
    logoutButtonText: {
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
    listBoxShadowLandscape: {
        borderRadius: 25,
    },
    listBoxOuterLandscape: {
        borderRadius: 25,
        padding: 5,
    },
    listBoxInnerLandscape: {
        borderRadius: 20,
        padding: 10,
        paddingVertical: 10,
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
    emptyContainerLandscape: {
        paddingVertical: 15,
    },
    emptyTextLandscape: {
        fontSize: 14,
        marginBottom: 6,
    },
    emptySubTextLandscape: {
        fontSize: 11,
    },
    characterListContainerLandscape: {
        maxHeight: 240,
    },
    characterCardLandscape: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    characterNameLandscape: {
        fontSize: 16,
    },
    characterLevelLandscape: {
        fontSize: 13,
    },
    characterClassLandscape: {
        fontSize: 11,
        marginBottom: 6,
    },
    hpBarLandscape: {
        height: 16,
        marginBottom: 6,
    },
    hpTextLandscape: {
        fontSize: 10,
        lineHeight: 16,
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
        paddingVertical: 8,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginTop: 6,
    },
    createButtonTextLandscape: {
        fontSize: 13,
    },
    logoutButtonLandscape: {
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 15,
    },
    logoutButtonTextLandscape: {
        fontSize: 12,
    },
});
