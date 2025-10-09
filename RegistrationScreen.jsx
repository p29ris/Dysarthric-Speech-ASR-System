import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendSignInLinkToEmail, createUserWithEmailAndPassword, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';

const actionCodeSettings = {
  url: 'https://asr-system-7744a.firebaseapp.com', // replace with your domain
  handleCodeInApp: true,
};

const RegistrationScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState('register'); // register → verifyLink → verifyPin
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigation = useNavigation();

  // --- Step 1: Send verification email ---
  const handleSendVerificationEmail = async () => {
    if (!email || !password) {
      setErrorMessage("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      await AsyncStorage.setItem("emailForSignIn", email);
      setStep("verifyLink");
      Alert.alert("Check your inbox", "We sent a verification link to your email. Click it to verify.");
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Complete verification when link is clicked ---
  const handleCompleteVerification = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem("emailForSignIn");
      if (isSignInWithEmailLink(auth, email)) {
        await signInWithEmailLink(auth, storedEmail, email);
        setStep("verifyPin");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setErrorMessage(error.message);
    }
  };

  // --- Step 3: Verify PIN & Create Account ---
  const handleVerifyPin = async () => {
    if (pin !== "123456") {
      setErrorMessage("The PIN is incorrect.");
      return;
    }

    try {
      const storedEmail = await AsyncStorage.getItem("emailForSignIn");
      await createUserWithEmailAndPassword(auth, storedEmail, password);

      Alert.alert("Success!", "Your account has been created. Please log in.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      console.error("PIN verification error:", error);
      setErrorMessage(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={styles.loaderOverlay} />
        ) : (
          <>
            {step === "register" && (
              <>
                <Text style={styles.title}>Create Account</Text>
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.button} onPress={handleSendVerificationEmail}>
                  <Text style={styles.buttonText}>Send Verification Email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.switchText}>Already have an account? Login</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "verifyLink" && (
              <>
                <Text style={styles.title}>Check Your Email</Text>
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <Text style={styles.infoText}>
                  We sent a verification link to your email. Click it, then press the button below.
                </Text>
                <TouchableOpacity style={styles.button} onPress={handleCompleteVerification}>
                  <Text style={styles.buttonText}>I Clicked the Link</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "verifyPin" && (
              <>
                <Text style={styles.title}>2FA Verification</Text>
                {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
                <TextInput
                  style={styles.input}
                  placeholder="Enter PIN"
                  placeholderTextColor="#999"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.button} onPress={handleVerifyPin}>
                  <Text style={styles.buttonText}>Verify PIN</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    minHeight: 350,
    justifyContent: 'center',
  },
  loaderOverlay: { paddingVertical: 100 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#fff' },
  input: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  button: { backgroundColor: '#007bff', paddingVertical: 12, borderRadius: 10, marginTop: 10, width: '100%' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  switchText: { color: '#add8e6', marginTop: 10, textAlign: 'center' },
  infoText: { color: '#ccc', textAlign: 'center', marginBottom: 15 },
  errorMessage: { color: '#ff6961', textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
});

export default RegistrationScreen;
