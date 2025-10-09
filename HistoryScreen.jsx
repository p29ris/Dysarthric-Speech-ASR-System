import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';

import { db } from './firebaseConfig'; // Import the db service

const HistoryScreen = ({ user, navigateTo }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const transcriptionsRef = collection(db, `users/${user.uid}/transcriptions`);
    const q = query(transcriptionsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        docs.push({ id: doc.id, ...data });
      });
      docs.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
      setHistory(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.title}>Transcription History</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('dashboard')}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : history.length === 0 ? (
        <Text style={styles.noHistoryText}>No transcriptions found. Start recording one!</Text>
      ) : (
        <ScrollView style={styles.historyList}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.itemDate}>{new Date(item.timestamp.toDate()).toLocaleString()}</Text>
              <Text style={styles.itemText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  historyContainer: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4a5568',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#edf2f7',
  },
  historyList: {
    width: '100%',
  },
  historyItem: {
    backgroundColor: '#2d3748',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemDate: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 5,
  },
  itemText: {
    color: '#edf2f7',
  },
  noHistoryText: {
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    color: '#a0aec0',
    marginTop: 10,
  },
});

export default HistoryScreen;
