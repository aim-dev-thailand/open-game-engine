import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
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
    const [error, setError] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

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
                password: password,
            }));
        } else {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            setIsRegistering(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.scrollContainer, isLandscape && styles.scrollContainerLandscape]}>
            <View style={[styles.container, isLandscape && styles.containerLandscape]}>
                <View style={[styles.contentWrapper, isLandscape && styles.contentWrapperLandscape]}>
                    {/* Register Box with Gradient */}
                    <View style={[styles.registerBoxShadow, isLandscape && styles.registerBoxShadowLandscape]}>
                        <LinearGradient
                            colors={['#FF1B6B', '#FF6B3D']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.registerBoxOuter, isLandscape && styles.registerBoxOuterLandscape]}
                        >
                            <View style={[styles.registerBoxInner, isLandscape && styles.registerBoxInnerLandscape]}>
                                <Text style={[styles.title, isLandscape && styles.titleLandscape]}>CREATE ACCOUNT</Text>

                                {error ? <Text style={[styles.errorText, isLandscape && styles.errorTextLandscape]}>{error}</Text> : null}

                                <TextInput
                                    placeholder="USERNAME"
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
                                    placeholder="PASSWORD"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setError("");
                                    }}
                                    style={[styles.input, isLandscape && styles.inputLandscape]}
                                    placeholderTextColor="#ddd"
                                    secureTextEntry
                                    autoCapitalize="none"
                                />

                                <TextInput
                                    placeholder="CONFIRM PASSWORD"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        setError("");
                                    }}
                                    style={[styles.input, isLandscape && styles.inputLandscape]}
                                    placeholderTextColor="#ddd"
                                    secureTextEntry
                                    autoCapitalize="none"
                                />

                                <TouchableOpacity
                                    style={[styles.registerButton, isRegistering && styles.registerButtonDisabled, isLandscape && styles.registerButtonLandscape]}
                                    onPress={handleRegister}
                                    disabled={isRegistering}
                                >
                                    <Text style={[styles.registerButtonText, isLandscape && styles.registerButtonTextLandscape]}>
                                        {isRegistering ? "Loading..." : "ลงทะเบียน"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Back to Login Button */}
                                <TouchableOpacity
                                    style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
                                    onPress={onBackToLogin}
                                >
                                    <Text style={[styles.backButtonText, isLandscape && styles.backButtonTextLandscape]}>กลับไปหน้าเข้าสู่ระบบ</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
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
    scrollContainerLandscape: {
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    containerLandscape: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    contentWrapper: {
        alignItems: 'center',
    },
    contentWrapperLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    registerBoxShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 20,
        borderRadius: 40,
    },
    registerBoxShadowLandscape: {
        borderRadius: 30,
    },
    registerBoxOuter: {
        borderRadius: 40,
        padding: 8,
    },
    registerBoxOuterLandscape: {
        borderRadius: 30,
        padding: 6,
    },
    registerBoxInner: {
        backgroundColor: '#FF9D6B',
        borderRadius: 32,
        padding: 30,
        paddingVertical: 40,
        alignItems: 'center',
        minWidth: 320,
    },
    registerBoxInnerLandscape: {
        borderRadius: 24,
        padding: 20,
        paddingVertical: 25,
        minWidth: 350,
    },
    title: {
        fontSize: 36,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 2,
    },
    titleLandscape: {
        fontSize: 28,
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#8B5A3C',
        color: 'white',
        padding: 14,
        width: 260,
        marginBottom: 14,
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#6B4423',
    },
    inputLandscape: {
        padding: 8,
        width: 280,
        marginBottom: 8,
        fontSize: 11,
        borderRadius: 10,
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
        width: 260,
    },
    errorTextLandscape: {
        fontSize: 10,
        marginBottom: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        width: 280,
    },
    registerButton: {
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
    registerButtonLandscape: {
        paddingVertical: 8,
        paddingHorizontal: 50,
        borderRadius: 10,
        marginTop: 6,
        width: 200,
        display: 'flex',
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    registerButtonTextLandscape: {
        fontSize: 13,
    },
    registerButtonDisabled: {
        backgroundColor: '#6b7280',
        opacity: 0.6,
    },
    backButton: {
        backgroundColor: '#45C4F0',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    backButtonLandscape: {
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 10,
        width: 200,
        display: 'flex',
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    backButtonTextLandscape: {
        fontSize: 13,
    },
});
