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
            <ActivityIndicator size="large" color="#007bff" style={styles.loaderOverlay} />
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
                  placeholderTextColor="#999"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Dark background
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    minHeight: 300, 
    justifyContent: 'center',
  },
  loaderOverlay: {
    paddingVertical: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#fff',
  },
  hintText: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#ff6961', // Red for caution
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  switchText: {
    color: '#add8e6',
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 15,
  },
  errorMessage: {
    color: '#ff6961',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});

export default ResetPassScreen;
