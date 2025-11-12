import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, TextInput, Alert, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOut, onAuthStateChanged, User } from 'firebase/auth'; // Import User type
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { auth, db } from './firebaseConfig'; 

// --- Configuration ---
const DIRECT_ASR_API_ENDPOINT = 'https://p29ris-dysarthria-asr-apiv3.hf.space/transcribe';

const DashboardScreen = () => {
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);
    const [transcription, setTranscription] = useState('');
    const navigation = useNavigation();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');
    // NEW: State to hold the current authenticated user object
    const [currentUser, setCurrentUser] = useState(null); 

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user); // Set the user object here
            if (user) {
                let nameToDisplay = 'User';
                if (user.displayName) {
                    nameToDisplay = user.displayName.split(' ')[0] || 'User';
                } else if (user.email) {
                    nameToDisplay = user.email.split('@')[0].split('.')[0]; 
                    nameToDisplay = nameToDisplay.charAt(0).toUpperCase() + nameToDisplay.slice(1);
                }
                setDisplayName(nameToDisplay);
            } else {
                 // User logged out, navigation to login should handle this (usually handled by the main App component)
            }
            setIsInitialLoading(false);
        });
        return () => unsubscribeAuth();
    }, [navigation]);

    // --- NEW FUNCTION: SAVE TRANSCRIPTION TO FIRESTORE ---
    // Now uses the guaranteed currentUser state variable
    const saveTranscriptionToHistory = async (text) => {
        // Use the state variable which is guaranteed to be set by onAuthStateChanged
        if (!currentUser || !text) { 
            console.error("Cannot save transcription: User not logged in or text is empty.");
            return;
        }

        const transcriptionPath = `users/${currentUser.uid}/transcriptions`; // Use currentUser
        console.log(`Attempting to save transcription to Firestore path: ${transcriptionPath}`); 
        console.log(`User UID: ${currentUser.uid}`); 

        try {
            // Path: users/{userId}/transcriptions
            const transcriptionsRef = collection(db, transcriptionPath);
            
            const docRef = await addDoc(transcriptionsRef, {
                text: text,
                timestamp: serverTimestamp(), // Use Firestore server timestamp for accuracy
                model: 'Dysarthria-ASR-v3' // Optionally track the model used
            });
            console.log("Transcription saved successfully to Firestore in the background. Document ID:", docRef.id); 
        } catch (error) {
            // This is the CRITICAL error log. Check this in your console!
            console.error("CRITICAL FIRESTORE ERROR: Failed to save transcription:", error);
        }
    };


    // --- CORE LOGIC FUNCTION: FASTAPI MULTIPART API CALL ---
    const directUploadAndTranscribe = async (audioUri, mimeType) => {
        // Use currentUser state variable for primary check
        if (!currentUser) { 
            setLoading(false);
            return Alert.alert('Error', 'User not authenticated.');
        }

        try {
            // 1. Prepare FormData payload for FastAPI using the URI directly.
            const formData = new FormData();
            
            // The key 'audio_file' MUST match the parameter name in your FastAPI function
            formData.append('audio_file', {
                uri: audioUri,
                // Ensure a valid filename is provided for the multipart form
                name: audioUri.split('/').pop() || 'audio_upload.m4a',
                type: mimeType || 'audio/m4a',
            });

            setTranscription('Uploading audio to ASR service...');
            console.log('Sending multipart POST request to FastAPI:', DIRECT_ASR_API_ENDPOINT);

            // 2. Execute the POST request
            const apiResponse = await fetch(DIRECT_ASR_API_ENDPOINT, {
                method: 'POST',
                body: formData, 
            });

            // --- DEBUG LOGGING ---
            console.log('API Response Status:', apiResponse.status);
            // --------------------

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.log('Error Response Body:', errorText);

                let errorMessage = `Server failed (${apiResponse.status})`;

                try {
                    const errorData = JSON.parse(errorText);
                    // Extract structured error details from FastAPI
                    errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}...`;
                }
                throw new Error(errorMessage);
            }

            const data = await apiResponse.json();

            // 3. Extract transcription result from FastAPI JSON response
            const resultText = data?.transcription || 'Transcription failed to return text.';
            
            setTranscription(resultText);
            Alert.alert('Success', 'Transcription complete!');
            
            // 4. CALL NEW SAVE FUNCTION (NON-BLOCKING)
            // This is now safe because we use the currentUser state variable
            saveTranscriptionToHistory(resultText);

        } catch (error) {
            console.error('ASR API Error:', error);
            setTranscription(`Error: ${error.message}`);
            Alert.alert('Processing Failed', error.message);
        } finally {
            // This runs immediately after success, or after an error.
            setLoading(false); 
        }
    };

    // --- Component Functions (Record/Stop/Upload) ---

    const startRecording = async () => {
        if (loading) return;
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await newRecording.startAsync();
            setRecording(newRecording);
            setIsRecording(true);
            setTranscription('Recording...');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording: ' + err.message);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        setLoading(true);
        setTranscription("Finalizing audio file...");

        try {
            await recording.stopAndUnloadAsync();
            
            // Retrieve URI and MimeType
            const recordingUri = recording.getURI();
            
            if (recordingUri) {
                // Defaulting to audio/m4a which is common for Expo recordings
                await directUploadAndTranscribe(recordingUri, 'audio/m4a'); 
            } else {
                throw new Error("Recording URI not found.");
            }
            // Clear recording state *after* successful processing attempt
            setRecording(null); 

        } catch (error) {
            console.error('Error in stopRecording or unload:', error);
            Alert.alert('Error', 'Failed to stop and save audio file: ' + error.message);
            setLoading(false);
            setTranscription(`Error: Failed to finalize recorded audio.`);
        }
    };

    const handleUploadAudio = async () => {
        if (loading) return;
        setLoading(true);
        setTranscription("Opening file picker...");

        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
            
            // HARDENED CHECK: Check if assets array exists and is not empty before accessing index 0
            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                
                // Use direct property access to avoid destructuring polyfill issues
                const uri = selectedAsset.uri;
                const mimeType = selectedAsset.mimeType;

                setTranscription("File picked. Preparing upload...");
                await directUploadAndTranscribe(uri, mimeType);

            } else {
                setLoading(false);
                setTranscription("Upload cancelled.");
            }
        } catch (err) {
            console.error('Failed to pick document', err);
            Alert.alert('Error', 'Failed to pick document: ' + err.message);
            setLoading(false);
            setTranscription(`Error: File selection failed.`);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setModalVisible(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const showLogoutModal = () => setModalVisible(true);
    const closeModal = () => setModalVisible(false);

    // FIX: Only show dashboard content if initial loading is done AND user is authenticated
    if (isInitialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9a7fd1" />
                <Text style={styles.loadingText}>Checking Authentication...</Text>
            </View>
        );
    }
    
    // Safety check: if user logs out while on dashboard, this prevents rendering issues
    if (!currentUser) {
        // In a real app with navigation, this usually redirects to Login screen, but here we show a loading placeholder
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Please log in.</Text>
            </View>
        );
    }


    // --- Render ---
    return (
        <View style={styles.container}>
            {/* Main content area (no card styling) */}
            <SafeAreaView style={styles.mainContentAreaWrapper}>
                
                {/* Custom Greeting Header */}
                <View style={styles.greetingHeader}>
                    {/* Updated to display the saved name */}
                    <Text style={styles.greetingText}>Welcome, {displayName}!</Text> 
                </View>
                
                <View style={styles.mainContentArea}>
                    <Text style={styles.title}>Record or Upload Audio</Text>

                    <TouchableOpacity
                        style={isRecording ? styles.stopButton : styles.recordButton}
                        onPress={isRecording ? stopRecording : startRecording}
                        disabled={loading}
                    >
                        <Text style={styles.recordButtonText}>
                            {isRecording ? '🛑 Stop Recording' : '🎙️ Start Recording'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleUploadAudio}
                        disabled={loading || isRecording}
                    >
                        <Text style={styles.buttonText}>☁️ Upload Audio</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.transcriptionInput}
                        multiline
                        placeholder="Transcription will appear here..."
                        placeholderTextColor="#a0a0a0"
                        value={transcription}
                        editable={false}
                    />

                    {loading && (
                        <ActivityIndicator size="large" color="#9a7fd1" style={{ marginBottom: 20 }} />
                    )}
                </View>
            </SafeAreaView>

            {/* Friendly Tab Bar Navigation */}
            <View style={styles.tabBarContainer}>
                {/* 1. History Tab-Style Item */}
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => navigation.navigate('History')}
                    disabled={loading}
                >
                    <Text style={styles.tabIcon}>🕰️</Text>
                    <Text style={styles.tabLabel}>History</Text>
                </TouchableOpacity>
                
                {/* 2. Logout Tab-Style Item */}
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={showLogoutModal}
                    disabled={loading}
                >
                    <Text style={styles.tabIconLogout}>🚪</Text>
                    <Text style={styles.tabLabelLogout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Are you sure you want to log out?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButtonLogout} onPress={handleLogout}>
                                <Text style={styles.modalButtonText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- Styles (Subdued Dark Lavender Theme) ---
const styles = StyleSheet.create({
    // Main Background
    container: { 
        flex: 1, 
        backgroundColor: '#1a1a1e', // Soft dark background
    },
    
    // Wrapper to ensure Safe Area is used for main content
    mainContentAreaWrapper: {
        flex: 1,
        paddingHorizontal: 24, // Apply screen padding here
    },

    // Custom Greeting Header
    greetingHeader: {
        // FIX: Increased paddingTop to push greeting down from status bar/notch area
        paddingTop: 30, 
        paddingBottom: 40, // Increased spacing below the greeting
        paddingLeft: 30, // Added padding left to align with screen padding
    },
    greetingText: {
        fontSize: 22, // Slightly larger font for greeting
        fontWeight: '500',
        color: '#9a7fd1', // Softer Lavender for greeting
    },
    
    // Main Content Area
    mainContentArea: {
        flex: 1,
        // Aligns content vertically (buttons, box) to the center of remaining space
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    
    // Loading State
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1a1a1e', 
    },
    loadingText: { 
        marginTop: 10, 
        color: '#f0f0f0', // Light text
        fontSize: 16,
    },
    
    // Text and Title
    title: { 
        fontSize: 30, // Increased size for prominence
        fontWeight: '700', 
        marginBottom: 30, 
        color: '#e0e0f0', // Soft white/light blue for title
        textAlign: 'center' 
    },
    
    // Primary Action Button (Record)
    recordButton: { 
        backgroundColor: '#6a1b9a', // Deep Purple (less vibrant)
        paddingVertical: 18, 
        borderRadius: 12, 
        marginBottom: 20, 
        width: '85%', 
        alignItems: 'center',
        shadowColor: '#6a1b9a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
    },
    
    // Secondary Action Button (Stop/Danger) - Lighter Red
    stopButton: { 
        backgroundColor: '#c2b3d8', // Muted Lavender for stop button background
        paddingVertical: 18, 
        borderRadius: 12, 
        marginBottom: 20, 
        width: '85%', 
        alignItems: 'center',
    },
    
    recordButtonText: { 
        color: '#ffffff', // White text for both Record (purple) and Stop (muted lavender)
        fontSize: 18, 
        fontWeight: 'bold' 
    },
    
    // Upload Button
    uploadButton: { 
        backgroundColor: '#4a4a50', // Dark gray for secondary button
        paddingVertical: 18, 
        borderRadius: 12, 
        marginBottom: 20, 
        width: '85%', 
        alignItems: 'center',
    },
    
    // Text Input Area
    transcriptionInput: { 
        backgroundColor: '#2a2a30', // Muted dark background for input
        color: '#f0f0f0', // Light text
        borderRadius: 12, 
        padding: 15, 
        // FIX: Changed width to '85%' to match buttons (was '100%')
        width: '90%', 
        // Height already reduced to 100
        height: 180, 
        textAlignVertical: 'top', 
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#5e5e66', // Subtle gray border
        marginBottom: 20, 
    },
    
    // --- TAB BAR STYLES (Fixed at bottom) ---
    tabBarContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80, 
        borderTopWidth: 1,
        borderTopColor: '#3a3a40', // Dark separator line
        backgroundColor: '#2a2a30', // Dark tab bar background
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 5 : 0, 
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    tabIcon: {
        fontSize: 24, 
        color: '#c2b3d8', // Muted Lavender icon
        marginBottom: 4,
    },
    tabIconLogout: {
        fontSize: 24,
        color: '#ff8a80', // Soft Red icon
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f0f0f0', // Light text for label
    },
    tabLabelLogout: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ff8a80', // Soft Red for logout label
    },
    
    // Modal Styles (Darkened to fit theme)
    centeredView: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.7)' // Darker modal backdrop
    },
    modalView: { 
        margin: 20, 
        backgroundColor: '#1f1f1f', // Dark modal content background
        borderRadius: 15, 
        padding: 30, 
        alignItems: 'center',
        width: '80%',
        elevation: 10,
    },
    modalText: { 
        marginBottom: 20, 
        fontSize: 18, 
        textAlign: 'center',
        color: '#e0e0f0', // Light text
    },
    modalButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%' 
    },
    modalButton: { 
        backgroundColor: '#3a3a40', // Dark gray button (Cancel)
        paddingVertical: 10, 
        paddingHorizontal: 20, 
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    modalButtonLogout: { 
        backgroundColor: '#6a1b9a', // Deep Purple (Logout confirmation)
        paddingVertical: 10, 
        paddingHorizontal: 20, 
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    modalButtonText: { 
        color: '#f0f0f0', // Light text
        fontWeight: 'bold' 
    },
});

export default DashboardScreen;