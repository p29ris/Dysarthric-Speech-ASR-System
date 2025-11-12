import React, { useState } from 'react';
// These imports are standard React Native modules, which the Expo runtime handles.
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'; 
import { useNavigation } from '@react-navigation/native';

// Firebase V9 modular imports
import { sendPasswordResetEmail } from 'firebase/auth';

// Ensure this path is correct for your Firebase initialization file
import { auth } from './firebaseConfig'; 

const ResetPassScreen = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();

    const handlePasswordReset = async () => {
        if (!email) {
            setErrorMessage("Please enter your email address.");
            return;
        }
        
        setLoading(true);
        setErrorMessage('');
        
        if (!auth) {
            setErrorMessage("Firebase Auth not initialized. Check firebaseConfig.jsx.");
            setLoading(false);
            console.error('Firebase Auth is undefined. Check import and initialization.');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            
            Alert.alert("Success", "Password reset link sent to your email. Check your inbox and spam folder.", [
                { text: "OK", onPress: () => navigation.navigate('Login') }
            ]);
            
        } catch (error) {
            // Handle Firebase errors like invalid email or user not found
            if (error.code === 'auth/user-not-found') {
                setErrorMessage('No account found with that email address.');
            } else if (error.code === 'auth/invalid-email') {
                setErrorMessage('The email address format is invalid.');
            } else {
                setErrorMessage(`Password reset failed: ${error.message}`);
            }
            console.error('Password reset error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {loading ? (
                    <ActivityIndicator size="large" color="#9a7fd1" style={styles.loaderOverlay} />
                ) : (
                    <>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.hintText}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#a0a0a0"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.button} onPress={handlePasswordReset} disabled={loading}>
                                <Text style={styles.buttonText}>Send Reset Link</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                                <Text style={styles.switchText}>
                                    Back to Login
                                </Text>
                            </TouchableOpacity>
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
        backgroundColor: '#1a1a1e', // Soft dark background
    },
    card: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#2a2a30', // Muted dark card background
        borderRadius: 20,
        padding: 30,
        // Subtle purple shadow
        shadowColor: 'rgba(106, 27, 154, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
        minHeight: 300, 
        justifyContent: 'center',
    },
    loaderOverlay: {
        paddingVertical: 100,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
        color: '#e0e0f0', // Soft white/light blue for title
    },
    hintText: {
        fontSize: 16,
        color: '#c2b3d8', // Muted Lavender text
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    input: {
        height: 50,
        backgroundColor: '#3a3a40', // Darker input background
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
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#6a1b9a', // Deep Purple (less vibrant)
        paddingVertical: 15,
        borderRadius: 12,
        marginBottom: 15,
        width: '100%',
        shadowColor: '#6a1b9a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    switchText: {
        color: '#c2b3d8', // Muted Lavender
        marginTop: 10,
        textAlign: 'center',
        marginBottom: 15,
        fontWeight: '600',
    },
    errorMessage: {
        color: '#ff8a80', // Soft Red Error
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default ResetPassScreen;