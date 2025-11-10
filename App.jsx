import React, { useState, useEffect } from 'react';
// These imports are standard React Native modules, which the Expo runtime handles.
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'; 
import { onAuthStateChanged } from 'firebase/auth';
// These navigation imports are handled by the Expo runtime (assuming you've installed them).
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// --- Import your screen components ---
// The compiler assumes these files exist in the same directory and export the component.
import LoginScreen from './LoginScreen'; 
import RegistrationScreen from './RegistrationScreen';
import ResetPassScreen from './ResetPassScreen';
import DashboardScreen from './DashboardScreen';
import HistoryScreen from './HistoryScreen';

// Import the auth and db services
import { auth, db } from './firebaseConfig';

const Stack = createStackNavigator();

const App = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Listen for authentication state changes
    // This listener handles automatic redirection to Dashboard or Login screen.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Authenticated Screens - ONLY if user is logged in AND email is verified */}
        {user && user.emailVerified ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        ) : (
          /* Unauthenticated Screens (Login, Register, Reset) */
          <>
            {/* The main entry point for unauthenticated users */}
            <Stack.Screen name="Login" component={LoginScreen} /> 
            
            {/* Screens accessible from the Login component */}
            <Stack.Screen 
              name="Registration" 
              component={RegistrationScreen} 
              options={{ headerShown: true, title: 'Create Account' }}
            />
            <Stack.Screen 
              name="ResetPass" 
              component={ResetPassScreen} 
              options={{ headerShown: true, title: 'Password Recovery' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#fff',
  },
});

export default App;