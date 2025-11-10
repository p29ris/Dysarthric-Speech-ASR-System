import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { auth } from './firebaseConfig'; // Assuming firebaseConfig is handled correctly elsewhere

// --- Configuration ---
// CORRECT ENDPOINT: This link targets your FastAPI endpoint set up to handle 'audio_file' uploads.
// Endpoint: https://p29ris-dysarthria-asr-apiv3.hf.space/transcribe (requires POST multipart/form-data)
const DIRECT_ASR_API_ENDPOINT = 'https://p29ris-dysarthria-asr-apiv3.hf.space/transcribe';

const DashboardScreen = () => {
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);
    const [transcription, setTranscription] = useState('');
    const navigation = useNavigation();
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) navigation.replace('Login');
            setIsInitialLoading(false);
        });
        return () => unsubscribeAuth();
    }, [navigation]);

    // --- CORE LOGIC FUNCTION: FASTAPI MULTIPART API CALL ---
    const directUploadAndTranscribe = async (audioUri, mimeType) => {
        if (!auth.currentUser) {
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
            // FastAPI expected schema: { transcription: str, model_name: str, time_taken_ms: float }
            const resultText = data?.transcription || 'Transcription failed to return text.';
            
            setTranscription(resultText);
            Alert.alert('Success', 'Transcription complete!');

        } catch (error) {
            console.error('ASR API Error:', error);
            setTranscription(`Error: ${error.message}`);
            Alert.alert('Processing Failed', error.message);
        } finally {
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

    if (isInitialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Checking Authentication...</Text>
            </View>
        );
    }

    // --- Render ---
    return (
        <View style={styles.container}>
            <View style={styles.contentCard}>
                <Text style={styles.title}>Record or Upload Audio</Text>

                <TouchableOpacity
                    style={isRecording ? styles.stopButton : styles.recordButton}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                >
                    <Text style={styles.recordButtonText}>
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleUploadAudio}
                    disabled={loading || isRecording}
                >
                    <Text style={styles.buttonText}>Upload Audio</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.transcriptionInput}
                    multiline
                    placeholder="Transcription will appear here..."
                    placeholderTextColor="#999"
                    value={transcription}
                    editable={false}
                />

                {loading && (
                    <ActivityIndicator size="large" color="#34c759" style={{ marginBottom: 20 }} />
                )}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => navigation.navigate('History')}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={showLogoutModal}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Logout</Text>
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

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#1a1a1a' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
    loadingText: { marginTop: 10, color: '#fff' },
    contentCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#fff', textAlign: 'center' },
    recordButton: { backgroundColor: '#ff3b30', paddingVertical: 15, borderRadius: 15, marginBottom: 20, width: '80%', alignItems: 'center' },
    stopButton: { backgroundColor: '#ff6961', paddingVertical: 15, borderRadius: 15, marginBottom: 20, width: '80%', alignItems: 'center' },
    recordButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    uploadButton: { backgroundColor: '#007bff', paddingVertical: 15, borderRadius: 15, marginBottom: 20, width: '80%', alignItems: 'center' },
    transcriptionInput: { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: 15, padding: 15, width: '100%', height: 150, textAlignVertical: 'top', fontSize: 16 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 20, width: '100%' },
    historyButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
    logoutButton: { backgroundColor: '#ff6961', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center' },
    modalText: { marginBottom: 15, fontSize: 18, textAlign: 'center' },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    modalButton: { backgroundColor: '#ccc', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    modalButtonLogout: { backgroundColor: '#ff6961', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default DashboardScreen;