import { Button, StyleSheet, Text, TextInput, View } from "react-native";

interface LoginPageProps {
    username: string;
    setUsername: (username: string) => void;
    setRole: (role: string) => void;
    setIsInGame: (inGame: boolean) => void;
    onGoToRegister: () => void;
}

export default function LoginPage({ username, setUsername, setRole, setIsInGame, onGoToRegister }: LoginPageProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>RPG MMORPG</Text>
            <TextInput
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholderTextColor="#999"
            />
            <Button title="เข้าสู่ระบบ" onPress={() => {
                setRole('user'); // บทบาทเริ่มต้น สามารถเปลี่ยนได้โดยคำสั่งผู้ดูแล
                setIsInGame(true);
            }} />
            <Text style={styles.registerLink} onPress={onGoToRegister}>
                ยังไม่มีบัญชี? สมัครสมาชิก
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
    title: { fontSize: 32, marginBottom: 20, color: '#fff', fontWeight: 'bold' },
    input: {
        borderWidth: 1,
        borderColor: '#3b82f6',
        backgroundColor: '#2a2a4e',
        color: '#fff',
        padding: 10,
        width: 200,
        marginBottom: 20,
        borderRadius: 8
    },
    registerLink: {
        color: '#3b82f6',
        marginTop: 16,
        fontSize: 14,
    }
});
