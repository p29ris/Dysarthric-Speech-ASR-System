import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'; // Added updateProfile
import { auth } from './firebaseConfig'; // Adjust path to your firebase config file

const RegistrationScreen = ({ navigation }) => {
    const [name, setName] = useState(''); // New State for Name
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false); 

    // Create account and send verification email
    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Please enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            // 1. Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // 2. Save the display name to the user's profile
            await updateProfile(userCredential.user, {
                displayName: name,
            });

            // 3. Send verification email 
            await sendEmailVerification(userCredential.user);
            
            // 4. Sign out immediately to prevent auto-login
            await auth.signOut();
            
            Alert.alert(
                "Check Your Email", 
                `We've sent a verification link to ${email}. Please check your inbox, verify your email, and then login.`,
                // Navigate back to Login after confirmation
                [{ text: "OK", onPress: () => navigation.navigate('Login') }]
            );
            
            // Clear form
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');

        } catch (error) {
            console.error(error);
            
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert("Error", "This email is already registered. Please login instead.");
            } else if (error.code === 'auth/weak-password') {
                Alert.alert("Error", "Password is too weak. Please use a stronger password.");
            } else {
                Alert.alert("Error", error.message);
            }
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
                        <Ionicons name="person-add-outline" size={60} color="#9a7fd1" style={styles.iconSmall} />
                        <Text style={styles.title}>Create Account</Text>
                        
                        {/* NEW: Name Input */}
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#a0a0a0"
                            autoCapitalize="words"
                            value={name}
                            onChangeText={setName}
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#a0a0a0"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Password (min 6 characters)"
                            placeholderTextColor="#a0a0a0"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#a0a0a0"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        
                        <TouchableOpacity 
                            style={styles.button}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Create Account</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>Already have an account? Login</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#9a7fd1" />
                            <Text style={styles.infoText}>
                                You'll receive a verification email. Please verify before logging in.
                            </Text>
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
        backgroundColor: '#1a1a1e' // Softer dark background
    },
    card: { 
        width: '90%', 
        maxWidth: 400, 
        backgroundColor: '#2a2a30', // Muted dark card background
        borderRadius: 20, 
        padding: 30, 
        // Subtle purple shadow for depth
        shadowColor: 'rgba(106, 27, 154, 0.4)', // Deep purple, semi-transparent
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, 
        shadowRadius: 10, 
        elevation: 8,
    },
    loaderOverlay: { paddingVertical: 100 },
    title: { 
        fontSize: 28, 
        fontWeight: '700', 
        color: '#e0e0f0', // Soft white/light blue for title
        marginBottom: 24, 
        textAlign: 'center',
    },
    input: { 
        width: '100%', 
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
    button: { 
        width: '100%', 
        paddingVertical: 15, 
        backgroundColor: '#6a1b9a', // Deep Purple (less vibrant)
        borderRadius: 12, 
        alignItems: 'center', 
        marginBottom: 12,
        shadowColor: '#6a1b9a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonText: { 
        color: '#FFFFFF', 
        fontSize: 18, 
        fontWeight: 'bold', 
    },
    linkText: { 
        color: '#c2b3d8', // Muted Lavender
        fontSize: 14, 
        textAlign: 'center', 
        marginTop: 8, 
        marginBottom: 16,
        fontWeight: '600',
    },
    iconSmall: {
        alignSelf: 'center',
        marginBottom: 16,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#3a3a40', // Darker input background for info box
        borderRadius: 8,
        padding: 12,
        marginTop: 16, 
        borderWidth: 1,
        borderColor: '#5e5e66', // Subtle gray border
        alignItems: 'flex-start',
    },
    infoText: {
        color: '#c2b3d8', // Muted Lavender text for info
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
});

export default RegistrationScreen;