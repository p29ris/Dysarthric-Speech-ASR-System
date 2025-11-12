import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { auth } from './firebaseConfig';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
    const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
    const navigation = useNavigation();

    // --- Biometric Setup ---
    useEffect(() => {
        (async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

                console.log("Biometric hardware available:", compatible);
                console.log("Biometric enrolled:", enrolled);
                console.log("Supported types:", supportedTypes);

                setIsBiometricsAvailable(compatible && enrolled);

                // Check if user has saved credentials for biometric login
                if (compatible && enrolled) {
                    const savedEmail = await SecureStore.getItemAsync('userEmail');
                    setHasSavedCredentials(!!savedEmail);
                }
            } catch (e) {
                console.warn("Biometric check failed:", e);
                setIsBiometricsAvailable(false);
            }
        })();
    }, []);

    // --- Biometric Authentication ---
    const handleBiometricAuth = async () => {
        setLoading(true);
        setErrorMessage('');

        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();

            if (!compatible || !enrolled) {
                Alert.alert("Unavailable", `${Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometrics'} not set up on this device.`);
                setLoading(false);
                return;
            }

            if (!hasSavedCredentials) {
                Alert.alert("No Saved Credentials", "Please login with email/password first to enable biometric login.");
                setLoading(false);
                return;
            }

            console.log("Starting biometric authentication...");

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Authenticate with ${Platform.OS === 'ios' ? 'Face ID' : 'Biometrics'}`,
                fallbackLabel: '',
                disableDeviceFallback: true, // prevents device password fallback
            });

            console.log("Biometric result:", JSON.stringify(result, null, 2));

            if (result.success) {
                console.log("Biometric authentication successful, retrieving credentials...");

                const savedEmail = await SecureStore.getItemAsync('userEmail');
                const savedPassword = await SecureStore.getItemAsync('userPassword');

                if (!savedEmail || !savedPassword) {
                    Alert.alert("Error", "Saved credentials not found. Please login with email/password again.");
                    setLoading(false);
                    return;
                }

                const userCredential = await signInWithEmailAndPassword(auth, savedEmail, savedPassword);

                if (!userCredential.user.emailVerified) {
                    await auth.signOut();
                    Alert.alert("Email Not Verified", "Please verify your email before logging in. Check your inbox.");
                    setLoading(false);
                    return;
                }

                console.log("Login successful!");
            } else {
                console.log("Biometric auth failed:", result.error || "User cancelled");
                Alert.alert("Authentication Failed", `${Platform.OS === 'ios' ? 'Face ID' : 'Biometric'} authentication failed or cancelled.`);
            }
        } catch (error) {
            console.error("Biometric error:", error);

            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                 Alert.alert(
                    "Invalid Credentials",
                    "Saved credentials are no longer valid. Please log in again to update.",
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                await SecureStore.deleteItemAsync('userEmail');
                                await SecureStore.deleteItemAsync('userPassword');
                                setHasSavedCredentials(false);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Error", `Biometric login failed: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Email/Password Login ---
    const handleAuthentication = async () => {
        if (!email || !password) {
            setErrorMessage("Please enter both email and password.");
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (!userCredential.user.emailVerified) {
                await auth.signOut();
                Alert.alert("Email Not Verified", "Please verify your email before logging in. Check your inbox.");
                setLoading(false);
                return;
            }

            // Ask user if they want to enable biometrics
            if (isBiometricsAvailable) {
                Alert.alert(
                    `Enable ${Platform.OS === 'ios' ? 'Face ID' : 'Biometrics'}?`,
                    `Would you like to use ${Platform.OS === 'ios' ? 'Face ID' : 'Biometrics'} for future logins?`,
                    [
                        { text: "No", style: "cancel" },
                        {
                            text: "Yes",
                            onPress: async () => {
                                try {
                                    await SecureStore.setItemAsync('userEmail', email);
                                    await SecureStore.setItemAsync('userPassword', password);
                                    setHasSavedCredentials(true);
                                    Alert.alert("Success", `${Platform.OS === 'ios' ? 'Face ID' : 'Biometrics'} login enabled!`);
                                } catch (e) {
                                    console.error("Failed to save credentials:", e);
                                }
                            }
                        }
                    ]
                );
            }

        } catch (error) {
            console.error("Authentication error:", error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                setErrorMessage('Invalid email or password.');
            } else if (error.code === 'auth/user-not-found') {
                setErrorMessage('No account found with this email.');
            } else if (error.code === 'auth/too-many-requests') {
                setErrorMessage('Too many failed attempts. Try again later.');
            } else if (error.code === 'auth/user-disabled') {
                setErrorMessage('This account has been disabled.');
            } else {
                setErrorMessage(`Login failed: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {loading ? (
                    <ActivityIndicator size="large" color="#d1c4e9" style={styles.loaderOverlay} />
                ) : (
                    <>
                        <Text style={styles.title}>Welcome Back</Text>
                        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#a0a0a0"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#a0a0a0"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.button} onPress={handleAuthentication} disabled={loading}>
                                <Text style={styles.buttonText}>Login</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('ResetPass')} disabled={loading}>
                                <Text style={styles.switchText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('Registration')} disabled={loading}>
                                <Text style={styles.switchText}>Need an account? Sign Up</Text>
                            </TouchableOpacity>

                            {isBiometricsAvailable && hasSavedCredentials && (
                                <TouchableOpacity
                                    style={styles.biometricButton}
                                    onPress={handleBiometricAuth}
                                    disabled={loading}
                                >
                                    <Text style={styles.biometricButtonText}>
                                        {`Login with ${Platform.OS === 'ios' ? 'Face ID' : 'Biometrics'}`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

// --- Styles (Subdued Dark Lavender Theme) ---
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1a1a1e' // Slightly softer dark background
    },
    card: { 
        width: '90%', 
        maxWidth: 400, 
        backgroundColor: '#2a2a30', // Muted dark card background
        borderRadius: 20, 
        padding: 30, 
        // More subtle, less glowing purple shadow
        shadowColor: 'rgba(106, 27, 154, 0.4)', // Deep purple, semi-transparent
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, // Reduced opacity
        shadowRadius: 10, // Slightly larger, softer radius
        elevation: 8, 
        minHeight: 350, 
        justifyContent: 'center' 
    },
    loaderOverlay: { paddingVertical: 100 },
    title: { 
        fontSize: 32, 
        fontWeight: '700', 
        marginBottom: 30, 
        textAlign: 'center', 
        color: '#e0e0f0' // Soft white/light blue for title
    },
    input: { 
        height: 50, 
        backgroundColor: '#3a3a40', // Darker input background for better contrast
        borderRadius: 12, 
        marginBottom: 16, 
        paddingHorizontal: 15, 
        color: '#f0f0f0', // Light text
        fontSize: 16, 
        borderWidth: 1,
        borderColor: '#5e5e66', // Subtle gray border
    },
    buttonContainer: { 
        marginTop: 10, 
        alignItems: 'center' 
    },
    button: { 
        backgroundColor: '#6a1b9a', // Deep Purple (less vibrant)
        paddingVertical: 15, 
        borderRadius: 12, 
        marginBottom: 15, 
        width: '100%',
        shadowColor: '#6a1b9a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, // Reduced shadow opacity
        shadowRadius: 4,
        elevation: 5,
    },
    buttonText: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    },
    switchText: { 
        color: '#c2b3d8', // Muted Lavender
        marginTop: 10, 
        textAlign: 'center', 
        marginBottom: 5,
        fontWeight: '600',
    },
    biometricButton: { 
        borderColor: '#9a7fd1', // Softer Lavender Border
        borderWidth: 2, 
        paddingVertical: 15, 
        borderRadius: 12, 
        marginTop: 20, 
        width: '100%' 
    },
    biometricButtonText: { 
        color: '#9a7fd1', // Softer Lavender Text
        fontSize: 16, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    },
    errorMessage: { 
        color: '#ff8a80', // Soft Red Error (unchanged, as it's a warning)
        textAlign: 'center', 
        marginBottom: 10, 
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default LoginScreen;