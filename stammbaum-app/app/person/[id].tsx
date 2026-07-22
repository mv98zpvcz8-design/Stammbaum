import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deletePerson, deleteRelationship, getPersonById, getRelationshipsForPerson } from '../../db/database';
import type { Person, Relationship } from '../../types/person';
import { RELATIONSHIP_LABELS } from '../../types/person';
import { fullName, lifespan } from '../../utils/format';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const db = useSQLiteContext();

  const [person, setPerson] = useState<Person | null>(null);
  const [relationships, setRelationships] = useState<(Relationship & { related_person: Person })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, rels] = await Promise.all([
      getPersonById(db, personId),
      getRelationshipsForPerson(db, personId),
    ]);
    setPerson(p);
    setRelationships(rels);
    setLoading(false);
  }, [db, personId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete() {
    Alert.alert('Person löschen', `${person ? fullName(person) : 'Diese Person'} wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deletePerson(db, personId);
          router.back();
        },
      },
    ]);
  }

  async function removeRelationship(relationshipId: number) {
    await deleteRelationship(db, relationshipId);
    load();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text>Person nicht gefunden.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {person.foto_uri ? (
          <Image source={{ uri: person.foto_uri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person" size={48} color="#9ca3af" />
          </View>
        )}
        <Text style={styles.name}>{fullName(person)}</Text>
        <Text style={styles.dates}>{lifespan(person)}</Text>
        {person.geburtsort ? (
          <Text style={styles.place}>
            <Ionicons name="location-outline" size={13} /> {person.geburtsort}
          </Text>
        ) : null}
      </View>

      {person.notizen ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notizen</Text>
          <Text style={styles.notes}>{person.notizen}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Beziehungen</Text>
          <Pressable
            style={styles.addRelButton}
            onPress={() => router.push(`/beziehung-hinzufuegen?personId=${personId}`)}
          >
            <Ionicons name="add-circle-outline" size={16} color="#2f6f4f" />
            <Text style={styles.addRelText}>Beziehung hinzufügen</Text>
          </Pressable>
        </View>

        {relationships.length === 0 ? (
          <Text style={styles.emptyRel}>Noch keine Beziehungen erfasst.</Text>
        ) : (
          relationships.map((rel) => (
            <View key={rel.id} style={styles.relRow}>
              <Pressable
                style={styles.relInfo}
                onPress={() => router.push(`/person/${rel.related_person_id}`)}
              >
                <Text style={styles.relName}>{fullName(rel.related_person)}</Text>
                <Text style={styles.relType}>{RELATIONSHIP_LABELS[rel.beziehungstyp]}</Text>
              </Pressable>
              <Pressable onPress={() => removeRelationship(rel.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Ionicons name="trash-outline" size={16} color="#ef4444" />
        <Text style={styles.deleteText}>Person löschen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  dates: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  place: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  addRelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addRelText: {
    color: '#2f6f4f',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyRel: {
    color: '#9ca3af',
    fontSize: 13,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  relInfo: {
    flex: 1,
  },
  relName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  relType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
