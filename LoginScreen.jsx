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
        Alert.alert("Unavailable", "Face ID / Touch ID not set up on this device.");
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
        promptMessage: 'Authenticate with Face ID',
        fallbackLabel: '',
        disableDeviceFallback: true, // ✅ prevents device password fallback
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
        Alert.alert("Authentication Failed", "Face ID authentication failed or cancelled.");
      }
    } catch (error) {
      console.error("Biometric error:", error);

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        Alert.alert(
          "Invalid Credentials",
          "Saved credentials are invalid. Please login again.",
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
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert(
          "Account Not Found",
          "This account no longer exists. Please register again.",
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
          "Enable Face ID?",
          "Would you like to use Face ID for future logins?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await SecureStore.setItemAsync('userEmail', email);
                  await SecureStore.setItemAsync('userPassword', password);
                  setHasSavedCredentials(true);
                  Alert.alert("Success", "Face ID login enabled!");
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
      if (error.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password.');
      } else if (error.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password.');
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
          <ActivityIndicator size="large" color="#007bff" style={styles.loaderOverlay} />
        ) : (
          <>
            <Text style={styles.title}>Login</Text>
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
                    Login with Face ID
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

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  card: { width: '90%', maxWidth: 400, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: 30, elevation: 8, minHeight: 350, justifyContent: 'center' },
  loaderOverlay: { paddingVertical: 100 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#fff' },
  input: { height: 50, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, marginBottom: 15, paddingHorizontal: 15, color: '#fff', fontSize: 18, textAlign: 'center' },
  buttonContainer: { marginTop: 10, alignItems: 'center' },
  button: { backgroundColor: '#007bff', paddingVertical: 12, borderRadius: 10, marginBottom: 10, width: '100%' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  switchText: { color: '#add8e6', marginTop: 10, textAlign: 'center', marginBottom: 15 },
  biometricButton: { borderColor: '#4299e1', borderWidth: 1, paddingVertical: 12, borderRadius: 10, marginTop: 15, width: '100%' },
  biometricButtonText: { color: '#4299e1', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  errorMessage: { color: '#ff6961', textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
});

export default LoginScreen;
