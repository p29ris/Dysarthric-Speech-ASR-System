import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { collection, onSnapshot, query, doc } from 'firebase/firestore'; 
import { db } from './firebaseConfig'; 

const HistoryScreen = ({ route, navigation }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // User is guaranteed to be passed via route.params.user
    const user = route?.params?.user || {}; 
    
    // Helper to format date for display
    const formatTimestamp = (timestamp) => {
        try {
            // Guard against null/undefined timestamp or timestamp without toDate()
            const date = timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date();
            return date.toLocaleString();
        } catch (e) {
            console.error("Timestamp formatting error:", e);
            return 'Date Unavailable';
        }
    };

    // Fetch Transcriptions in Realtime
    useEffect(() => {
        // --- ADDED DEBUG LOGGING ---
        console.log("HistoryScreen: user param", user);
        // ---------------------------

        if (!user.uid) {
            console.warn("History Screen: Waiting for user UID via route parameters...");
            setLoading(false); 
            return;
        }
        
        console.log(`History Screen: Subscribing to history for UID: ${user.uid}`);
        setLoading(true); 

        // Read Path: db/users/{UID}/transcriptions
        const userDocRef = doc(db, 'users', user.uid); 
        const transcriptionsRef = collection(userDocRef, 'transcriptions'); 
        const q = query(transcriptionsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // --- ADDED SNAPSHOT DEBUG LOGGING ---
            console.log("HistoryScreen: snapshot size", snapshot.size);
            // ------------------------------------

            const docs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // IMPORTANT: We only include documents that have a valid timestamp, 
                // preventing pending server timestamps from causing issues.
                if (data.timestamp && data.timestamp.toDate) {
                    // console.log("Doc:", doc.id, doc.data()); // Uncomment for extreme logging
                    docs.push({ id: doc.id, ...data });
                }
            });
            
            // Sort by timestamp descending (newest first)
            docs.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()); 
            
            setHistory(docs);
            setLoading(false);
            console.log(`History Screen: Successfully loaded ${docs.length} transcriptions.`);
        }, (error) => {
            console.error("CRITICAL HISTORY ERROR: Error fetching history:", error);
            setLoading(false);
        });

        // Cleanup
        return () => unsubscribe();
    }, [user.uid]); // Depend ONLY on user.uid.

    return (
        <SafeAreaView style={styles.screenWrapper}>
            <View style={styles.historyHeader}>
                <Text style={styles.title}>Transcription History</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
            </View>
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9a7fd1" />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : history.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.noHistoryText}>No transcriptions found. Start recording one!</Text>
                </View>
            ) : (
                <ScrollView style={styles.historyList} contentContainerStyle={styles.historyContent}>
                    {history.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                            <Text style={styles.itemDate}>
                                {formatTimestamp(item.timestamp)}
                            </Text>
                            <Text style={styles.itemText}>{item.text}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

/* Styles remain the same
const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: '#1a1a1e', 
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', 
        marginTop: 30, 
        marginBottom: 0,
        paddingHorizontal: 25, 
    },
    backButton: {
        flexDirection: 'row', 
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12, 
        borderRadius: 8,
        backgroundColor: '#6a1b9a', 
        marginHorizontal: -65,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#e0e0f0', 
    },
    historyList: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 24,
    },
    historyContent: {
        paddingBottom: 20, 
    },
    historyItem: {
        backgroundColor: '#2a2a30', 
        padding: 18,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: 'rgba(106, 27, 154, 0.4)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3, 
    },
    itemDate: {
        fontSize: 12,
        color: '#9a7fd1', 
        marginBottom: 8,
    },
    itemText: {
        color: '#f0f0f0', 
        fontSize: 16,
        lineHeight: 22,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24, 
    },
    noHistoryText: {
        color: '#c2b3d8', 
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        paddingHorizontal: 24, 
    },
    loadingText: {
        color: '#c2b3d8',
        marginTop: 10,
    },
});

export default HistoryScreen;*/

const styles = StyleSheet.create({
    // Full screen container: No horizontal padding here
    screenWrapper: {
        flex: 1,
        backgroundColor: '#1a1a1e', // Soft dark background
    },
    // Header now handles the horizontal padding and vertical spacing
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Ensures title and button are vertically aligned
        marginTop: 30, // Small margin after SafeAreaView effect
        marginBottom: 0,
        paddingHorizontal: 25, // Horizontal padding applied here
    },
    backButton: {
        flexDirection: 'row', // To align icon and text horizontally
        alignItems: 'center',
        paddingVertical: 8,
        // FIX: Retained internal horizontal padding for content spacing
        paddingHorizontal: 12, 
        borderRadius: 8,
        backgroundColor: '#6a1b9a', // Deep Purple
        // FIX: Use negative margin to offset the parent container's padding, pulling the button inward
        marginRight: 0, 
        marginHorizontal: -65,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#e0e0f0', // Soft white/light blue for title
    },
    // History list now requires its own horizontal padding
    historyList: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 24,
    },
    historyContent: {
        paddingBottom: 20, // Space at the bottom of the scroll view
    },
    historyItem: {
        backgroundColor: '#2a2a30', // Muted dark card background
        padding: 18,
        borderRadius: 12,
        marginBottom: 10,
        // Card shadow for depth
        shadowColor: 'rgba(106, 27, 154, 0.4)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3, 
    },
    itemDate: {
        fontSize: 12,
        color: '#9a7fd1', // Softer Lavender date text
        marginBottom: 8,
    },
    itemText: {
        color: '#f0f0f0', // Light text for transcription content
        fontSize: 16,
        lineHeight: 22,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24, // Apply padding to empty container
    },
    noHistoryText: {
        color: '#c2b3d8', // Muted Lavender
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        paddingHorizontal: 24, // Apply padding to loading container
    },
    loadingText: {
        color: '#c2b3d8',
        marginTop: 10,
    },
});

export default HistoryScreen;