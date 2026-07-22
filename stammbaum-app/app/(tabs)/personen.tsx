import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { PersonCard } from '../../components/PersonCard';
import { getAllPersons } from '../../db/database';
import type { Person } from '../../types/person';

export default function PersonenScreen() {
  const db = useSQLiteContext();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPersons = useCallback(async () => {
    const rows = await getAllPersons(db);
    setPersons(rows);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadPersons();
    }, [loadPersons])
  );

  if (!loading && persons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="#c0c0c0" />
        <Text style={styles.emptyTitle}>Noch keine Personen</Text>
        <Text style={styles.emptyText}>
          Lege über den Tab „Hinzufügen“ die erste Person deines Stammbaums an.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={persons}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <PersonCard person={item} onPress={() => router.push(`/person/${item.id}`)} />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  listContent: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
    backgroundColor: '#f3f4f6',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
