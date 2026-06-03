import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';
import {StyleSheet} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthContext} from './src/context/AuthContext';
import {loadCredentials} from './src/api/client';
import {colors} from './src/theme/colors';

// Required: must be called before any navigation renders
enableScreens();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured,    setIsConfigured]    = useState(false);

  useEffect(() => {
    loadCredentials().then(ok => setIsConfigured(ok));
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthContext.Provider
          value={{isAuthenticated, setIsAuthenticated, isConfigured, setIsConfigured}}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
});
