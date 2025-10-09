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
import { auth } from './firebaseConfig';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const navigation = useNavigation();

  // --- Biometric Setup ---
  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricsAvailable(compatible && enrolled);
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
      if (!isBiometricsAvailable) {
        setErrorMessage("Biometric authentication not available on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: Platform.OS === 'ios' 
          ? 'Authenticate with Face ID / Touch ID' 
          : 'Authenticate with Biometrics',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false, // Allow device PIN/Pattern fallback
      });

      if (result.success) {
        Alert.alert("Success ✅", "Biometric authentication successful!");
        // TODO: Use a stored session/token or fetch from secure storage
        // Example: SecureStore.getItemAsync("userSession")
        // navigation.replace("Dashboard"); 
      } else {
        setErrorMessage("Biometric authentication failed or was cancelled.");
      }
    } catch (error) {
      console.error("Biometric error:", error);
      setErrorMessage("Biometric authentication unavailable. Please use email & password.");
    } finally {
      setLoading(false);
    }
  };

  // --- Credential Login Flow ---
  const handleAuthentication = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Successful login: App.jsx listener will redirect to Dashboard
    } catch (error) {
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/too-many-requests'
      ) {
        setErrorMessage('Invalid credentials or account locked. Please try again.');
      } else {
        setErrorMessage(`Authentication failed: ${error.message}`);
      }
      console.error("Authentication error:", error);
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
            
            {/* Email & Password Inputs */}
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

            {/* Buttons */}
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

              {/* Biometric Button */}
              {isBiometricsAvailable && (
                <TouchableOpacity 
                  style={styles.biometricButton} 
                  onPress={handleBiometricAuth} 
                  disabled={loading}
                >
                  <Text style={styles.biometricButtonText}>
                    {Platform.OS === 'ios' ? 'Login with Face ID / Touch ID' : 'Login with Biometrics'}
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
