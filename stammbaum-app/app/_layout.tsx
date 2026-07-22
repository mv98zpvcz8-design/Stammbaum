import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { DATABASE_NAME, initDatabase } from '../db/database';

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>
        <Stack screenOptions={{ headerBackTitle: 'Zurück' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="person/[id]" options={{ title: 'Person' }} />
          <Stack.Screen
            name="beziehung-hinzufuegen"
            options={{ title: 'Beziehung hinzufügen', presentation: 'modal' }}
          />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Datenbank wird geladen…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: '#666',
  },
});
