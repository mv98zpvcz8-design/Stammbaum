import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { createRelationship, getAllPersons } from '../db/database';
import type { Person, RelationshipType } from '../types/person';
import { RELATIONSHIP_LABELS, RELATIONSHIP_TYPES } from '../types/person';
import { fullName } from '../utils/format';

export default function BeziehungHinzufuegenScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const currentPersonId = Number(personId);
  const db = useSQLiteContext();

  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<RelationshipType>('eltern');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllPersons(db).then((rows) => setPersons(rows.filter((p) => p.id !== currentPersonId)));
  }, [db, currentPersonId]);

  async function handleSave() {
    if (selectedPersonId == null) return;
    setSaving(true);
    try {
      await createRelationship(db, currentPersonId, selectedPersonId, selectedType);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Person auswählen</Text>
      {persons.length === 0 ? (
        <Text style={styles.emptyText}>
          Lege zuerst eine weitere Person an, um eine Beziehung herzustellen.
        </Text>
      ) : (
        <FlatList
          data={persons}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          renderItem={({ item }) => {
            const selected = item.id === selectedPersonId;
            return (
              <Pressable
                style={[styles.personRow, selected && styles.personRowSelected]}
                onPress={() => setSelectedPersonId(item.id)}
              >
                <Text style={[styles.personName, selected && styles.personNameSelected]}>
                  {fullName(item)}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color="#2f6f4f" /> : null}
              </Pressable>
            );
          }}
        />
      )}

      <Text style={styles.sectionTitle}>Beziehungstyp</Text>
      <View style={styles.typeRow}>
        {RELATIONSHIP_TYPES.map((type) => {
          const selected = type === selectedType;
          return (
            <Pressable
              key={type}
              style={[styles.typeChip, selected && styles.typeChipSelected]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                {RELATIONSHIP_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.saveButton, (selectedPersonId == null || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={selectedPersonId == null || saving}
      >
        <Text style={styles.saveButtonText}>Beziehung speichern</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  list: {
    maxHeight: 260,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f9fafb',
  },
  personRowSelected: {
    backgroundColor: '#eaf4ee',
  },
  personName: {
    fontSize: 14,
    color: '#1f2937',
  },
  personNameSelected: {
    fontWeight: '600',
    color: '#2f6f4f',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  typeChipSelected: {
    backgroundColor: '#2f6f4f',
  },
  typeChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 'auto',
    backgroundColor: '#2f6f4f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
