import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { PersonForm } from '../../components/PersonForm';
import { createPerson } from '../../db/database';
import type { PersonInput } from '../../types/person';

export default function HinzufuegenScreen() {
  const db = useSQLiteContext();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(value: PersonInput) {
    setSaving(true);
    try {
      const id = await createPerson(db, value);
      router.replace(`/person/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PersonForm
      onSubmit={handleSubmit}
      renderSubmit={({ onPress, disabled }) => (
        <Pressable
          style={[styles.submit, (disabled || saving) && styles.submitDisabled]}
          onPress={onPress}
          disabled={disabled || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Person speichern</Text>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  submit: {
    backgroundColor: '#2f6f4f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
