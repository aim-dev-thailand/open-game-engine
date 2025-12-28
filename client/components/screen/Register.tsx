import { StyleSheet, Text, TextInput, View, TouchableOpacity } from "react-native";
import { useState, useEffect, useRef } from "react";
import { WS_API } from "@/env";

interface RegisterPageProps {
    onBackToLogin: () => void;
    onRegisterSuccess: (username: string, role: string) => void;
}

export default function Register({ onBackToLogin, onRegisterSuccess }: RegisterPageProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // เชื่อมต่อ WebSocket
        wsRef.current = new WebSocket(WS_API);

        wsRef.current.onopen = () => {
            console.log("WebSocket connected for registration");
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === "register_success") {
                // สมัครสมาชิกสำเร็จ
                setIsRegistering(false);
                onRegisterSuccess(username, data.role || "user");
            } else if (data.type === "register_error") {
                // เกิดข้อผิดพลาด
                setIsRegistering(false);
                setError(data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
            }
        };

        wsRef.current.onerror = () => {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsRegistering(false);
        };

        return () => {
            wsRef.current?.close();
        };
    }, [username, onRegisterSuccess]);

    const handleRegister = () => {
        // Client-side validation
        if (!username.trim()) {
            setError("กรุณากรอกชื่อผู้ใช้");
            return;
        }
        if (!email.trim()) {
            setError("กรุณากรอกอีเมล");
            return;
        }
        if (!password.trim()) {
            setError("กรุณากรอกรหัสผ่าน");
            return;
        }
        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }
        if (password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        // ส่งข้อมูลไปที่ server
        setError("");
        setIsRegistering(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "register",
                username: username.trim(),
                email: email.trim(),
                password: password,
            }));
        } else {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsRegistering(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>สมัครสมาชิก</Text>
            <Text style={styles.subtitle}>RPG MMORPG</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                }}
                style={styles.input}
                placeholderTextColor="#999"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="อีเมล"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                }}
                style={styles.input}
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                }}
                style={styles.input}
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
            />

            <TextInput
                placeholder="ยืนยันรหัสผ่าน"
                value={confirmPassword}
                onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                }}
                style={styles.input}
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
            />

            <TouchableOpacity
                style={[styles.registerButton, isRegistering && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isRegistering}
            >
                <Text style={styles.registerButtonText}>
                    {isRegistering ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
                <Text style={styles.backButtonText}>กลับไปหน้าเข้าสู่ระบบ</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#a0a0a0",
        marginBottom: 32,
    },
    input: {
        borderWidth: 1,
        borderColor: "#3b82f6",
        backgroundColor: "#2a2a4e",
        color: "#fff",
        padding: 12,
        width: 280,
        marginBottom: 16,
        borderRadius: 8,
        fontSize: 16,
    },
    errorText: {
        color: "#ef4444",
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    registerButton: {
        backgroundColor: "#3b82f6",
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: 280,
        alignItems: "center",
        marginTop: 8,
    },
    registerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    registerButtonDisabled: {
        backgroundColor: "#6b7280",
        opacity: 0.6,
    },
    backButton: {
        marginTop: 20,
        padding: 8,
    },
    backButtonText: {
        color: "#3b82f6",
        fontSize: 14,
    },
});
