import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PersonInput } from '../types/person';
import { PhotoPicker } from './PhotoPicker';

interface PersonFormProps {
  initialValue?: Partial<PersonInput>;
  onSubmit: (value: PersonInput) => void;
  renderSubmit: (props: { onPress: () => void; disabled: boolean }) => ReactNode;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function PersonForm({ initialValue, onSubmit, renderSubmit }: PersonFormProps) {
  const [vorname, setVorname] = useState(initialValue?.vorname ?? '');
  const [nachname, setNachname] = useState(initialValue?.nachname ?? '');
  const [geburtsdatum, setGeburtsdatum] = useState(initialValue?.geburtsdatum ?? '');
  const [sterbedatum, setSterbedatum] = useState(initialValue?.sterbedatum ?? '');
  const [geburtsort, setGeburtsort] = useState(initialValue?.geburtsort ?? '');
  const [notizen, setNotizen] = useState(initialValue?.notizen ?? '');
  const [fotoUri, setFotoUri] = useState<string | null>(initialValue?.foto_uri ?? null);

  const canSubmit = vorname.trim().length > 0 && nachname.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      geburtsdatum: emptyToNull(geburtsdatum),
      sterbedatum: emptyToNull(sterbedatum),
      geburtsort: emptyToNull(geburtsort),
      notizen: emptyToNull(notizen),
      foto_uri: fotoUri,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PhotoPicker uri={fotoUri} onChange={setFotoUri} />

      <Field label="Vorname *">
        <TextInput
          style={styles.input}
          value={vorname}
          onChangeText={setVorname}
          placeholder="Vorname"
          autoCapitalize="words"
        />
      </Field>

      <Field label="Nachname *">
        <TextInput
          style={styles.input}
          value={nachname}
          onChangeText={setNachname}
          placeholder="Nachname"
          autoCapitalize="words"
        />
      </Field>

      <Field label="Geburtsdatum">
        <TextInput
          style={styles.input}
          value={geburtsdatum}
          onChangeText={setGeburtsdatum}
          placeholder="JJJJ-MM-TT"
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Sterbedatum">
        <TextInput
          style={styles.input}
          value={sterbedatum}
          onChangeText={setSterbedatum}
          placeholder="JJJJ-MM-TT"
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Geburtsort">
        <TextInput
          style={styles.input}
          value={geburtsort}
          onChangeText={setGeburtsort}
          placeholder="Geburtsort"
        />
      </Field>

      <Field label="Notizen">
        <TextInput
          style={[styles.input, styles.notes]}
          value={notizen}
          onChangeText={setNotizen}
          placeholder="Notizen"
          multiline
        />
      </Field>

      {renderSubmit({ onPress: handleSubmit, disabled: !canSubmit })}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
