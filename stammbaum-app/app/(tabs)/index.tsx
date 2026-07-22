import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getAllPersons, getAllRelationships } from '../../db/database';
import type { Person } from '../../types/person';
import { buildForest, type TreeRow } from '../../utils/tree';
import { fullName, lifespan } from '../../utils/format';

export default function BaumScreen() {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [persons, relationships] = await Promise.all([
      getAllPersons(db),
      getAllRelationships(db),
    ]);
    setRows(buildForest(persons, relationships));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!loading && rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="git-network-outline" size={48} color="#c0c0c0" />
        <Text style={styles.emptyTitle}>Dein Stammbaum ist noch leer</Text>
        <Text style={styles.emptyText}>
          Füge Personen und ihre Beziehungen hinzu, um den Baum hier zu sehen.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={rows}
      keyExtractor={(item) => String(item.person.id)}
      renderItem={({ item }) => <TreeRowView row={item} />}
    />
  );
}

function TreeRowView({ row }: { row: TreeRow }) {
  const { person, depth, spouses } = row;
  return (
    <View style={[styles.row, { paddingLeft: 16 + depth * 24 }]}>
      {depth > 0 ? <Text style={styles.branch}>└─</Text> : null}
      <Pressable style={styles.nodeButton} onPress={() => router.push(`/person/${person.id}`)}>
        <Text style={styles.nodeName}>{fullName(person)}</Text>
        <Text style={styles.nodeDates}>{lifespan(person)}</Text>
        {spouses.length > 0 ? (
          <Text style={styles.spouses}>⚭ {spouses.map((s) => fullName(s)).join(', ')}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 12,
    paddingRight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  branch: {
    color: '#c0c0c0',
    marginRight: 6,
  },
  nodeButton: {
    flex: 1,
  },
  nodeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  nodeDates: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  spouses: {
    fontSize: 12,
    color: '#2f6f4f',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
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
