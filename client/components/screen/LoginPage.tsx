import { Button, StyleSheet, Text, TextInput, View } from "react-native";

interface LoginPageProps {
    username: string;
    setUsername: (username: string) => void;
    setRole: (role: string) => void;
    setIsInGame: (inGame: boolean) => void;
}

export default function LoginPage({ username, setUsername, setRole, setIsInGame }: LoginPageProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>RPG MMORPG</Text>
            <TextInput
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
            />
            <Button title="เข้าสู่ระบบ" onPress={() => {
                setRole('user'); // บทบาทเริ่มต้น สามารถเปลี่ยนได้โดยคำสั่งผู้ดูแล
                setIsInGame(true);
            }} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 32, marginBottom: 20 },
    input: { borderWidth: 1, padding: 10, width: 200, marginBottom: 20 }
});
