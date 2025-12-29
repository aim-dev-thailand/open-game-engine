import { StyleSheet, Text, TextInput, View, TouchableOpacity, useWindowDimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from "react";
import { WS_API } from "@/env";

interface LoginPageProps {
    username: string;
    setUsername: (username: string) => void;
    setRole: (role: string) => void;
    setIsInGame: (inGame: boolean) => void;
    onGoToRegister: () => void;
}

export default function LoginPage({ username, setUsername, setRole, setIsInGame, onGoToRegister }: LoginPageProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    useEffect(() => {
        // เชื่อมต่อ WebSocket
        wsRef.current = new WebSocket(WS_API);

        wsRef.current.onopen = () => {
            console.log("WebSocket connected for login");
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === "login_success") {
                // Login สำเร็จ
                setIsLoggingIn(false);
                setRole(data.role || "user");
                setIsInGame(true);
            } else if (data.type === "login_error") {
                // เกิดข้อผิดพลาด
                setIsLoggingIn(false);
                setError(data.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
            }
        };

        wsRef.current.onerror = () => {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsLoggingIn(false);
        };

        return () => {
            wsRef.current?.close();
        };
    }, [setRole, setIsInGame]);

    const handleLogin = () => {
        // Client-side validation
        if (!username.trim()) {
            setError("กรุณากรอกชื่อผู้ใช้");
            return;
        }

        if (!password.trim()) {
            setError("กรุณากรอกรหัสผ่าน");
            return;
        }

        // ส่งข้อมูลไปที่ server
        setError("");
        setIsLoggingIn(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "login",
                username: username.trim(),
                password: password,
            }));
        } else {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsLoggingIn(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.contentWrapper, isLandscape && styles.contentWrapperLandscape]}>
                {/* Login Box with Gradient */}
                <View style={[styles.loginBoxShadow, isLandscape && styles.loginBoxShadowLandscape]}>
                    <LinearGradient
                        colors={['#FF1B6B', '#FF6B3D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.loginBoxOuter, isLandscape && styles.loginBoxOuterLandscape]}
                    >
                        <View style={[styles.loginBoxInner, isLandscape && styles.loginBoxInnerLandscape]}>
                            <Text style={[styles.title, isLandscape && styles.titleLandscape]}>LOGIN</Text>

                            {error ? <Text style={[styles.errorText, isLandscape && styles.errorTextLandscape]}>{error}</Text> : null}

                            <TextInput
                                placeholder="ENTER USERNAME"
                                value={username}
                                onChangeText={(text) => {
                                    setUsername(text);
                                    setError("");
                                }}
                                style={[styles.input, isLandscape && styles.inputLandscape]}
                                placeholderTextColor="#ddd"
                                autoCapitalize="none"
                            />

                            <TextInput
                                placeholder="ENTER PASSWORD"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setError("");
                                }}
                                secureTextEntry
                                style={[styles.input, isLandscape && styles.inputLandscape]}
                                placeholderTextColor="#ddd"
                                autoCapitalize="none"
                            />

                            <TouchableOpacity
                                style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled, isLandscape && styles.loginButtonLandscape]}
                                onPress={handleLogin}
                                disabled={isLoggingIn}
                            >
                                <Text style={[styles.loginButtonText, isLandscape && styles.loginButtonTextLandscape]}>
                                    {isLoggingIn ? "Loading..." : "เข้าสู่ระบบ"}
                                </Text>
                            </TouchableOpacity>

                            {/* Create Account Button */}
                            <TouchableOpacity
                                style={[styles.createAccountButton, isLandscape && styles.createAccountButtonLandscape]}
                                onPress={onGoToRegister}
                            >
                                <Text style={[styles.createAccountText, isLandscape && styles.createAccountTextLandscape]}>สร้างบัญชีใหม่</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    contentWrapper: {
        alignItems: 'center',
    },
    contentWrapperLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    loginBoxShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 20,
        borderRadius: 40,
    },
    loginBoxShadowLandscape: {
        borderRadius: 30,
    },
    loginBoxOuter: {
        borderRadius: 40,
        padding: 8,
    },
    loginBoxOuterLandscape: {
        borderRadius: 30,
        padding: 6,
    },
    loginBoxInner: {
        backgroundColor: '#FF9D6B',
        borderRadius: 32,
        padding: 40,
        paddingVertical: 50,
        alignItems: 'center',
        minWidth: 320,
    },
    loginBoxInnerLandscape: {
        borderRadius: 24,
        padding: 25,
        paddingVertical: 30,
        minWidth: 350,
    },
    title: {
        fontSize: 48,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 2,
    },
    titleLandscape: {
        fontSize: 32,
        marginBottom: 15,
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
        width: 240,
    },
    errorTextLandscape: {
        fontSize: 11,
        marginBottom: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        width: 280,
    },
    input: {
        backgroundColor: '#8B5A3C',
        color: 'white',
        padding: 16,
        width: 240,
        marginBottom: 16,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#6B4423',
    },
    inputLandscape: {
        padding: 10,
        width: 280,
        marginBottom: 10,
        fontSize: 12,
        borderRadius: 10,
    },
    loginButton: {
        backgroundColor: '#45C4F0',
        paddingVertical: 14,
        paddingHorizontal: 60,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    loginButtonLandscape: {
        paddingVertical: 10,
        paddingHorizontal: 50,
        borderRadius: 10,
        marginTop: 8,
        width: 200,
        display: 'flex',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    loginButtonTextLandscape: {
        fontSize: 14,
    },
    loginButtonDisabled: {
        backgroundColor: '#6b7280',
        opacity: 0.6,
    },
    createAccountButton: {
        backgroundColor: '#45C4F0',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 12,
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    createAccountButtonLandscape: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginTop: 10,
        marginLeft: 0,
        width: 200,
        display: 'flex',
        alignItems: 'center',
    },
    createAccountText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    createAccountTextLandscape: {
        fontSize: 14,
    },
});
