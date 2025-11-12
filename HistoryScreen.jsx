import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';

import { db } from './firebaseConfig'; // Import the db service

// Changed props from { user, navigateTo } to { user, navigation }
const HistoryScreen = ({ user, navigation }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Transcriptions in Realtime
    useEffect(() => {
        if (!user || !user.uid) {
            setLoading(false);
            return;
        }

        // Firestore Path: users/{userId}/transcriptions
        const transcriptionsRef = collection(db, `users/${user.uid}/transcriptions`);
        const q = query(transcriptionsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Ensure timestamp exists and can be converted
                if (data.timestamp) {
                    docs.push({ id: doc.id, ...data });
                }
            });
            // Sort by timestamp descending (newest first)
            docs.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()); 
            
            setHistory(docs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching history:", error);
            setLoading(false);
            // In a real app, you might show a persistent error message here
        });

        return () => unsubscribe();
    }, [user]);

    return (
        // FIX: Using SafeAreaView to handle notches and status bars
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
                // ScrollView maintains its own padding
                <ScrollView style={styles.historyList} contentContainerStyle={styles.historyContent}>
                    {history.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                            <Text style={styles.itemDate}>
                                {new Date(item.timestamp.toDate()).toLocaleString()}
                            </Text>
                            <Text style={styles.itemText}>{item.text}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

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