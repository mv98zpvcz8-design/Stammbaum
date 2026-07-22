import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Person } from '../types/person';
import { fullName, lifespan } from '../utils/format';

interface PersonCardProps {
  person: Person;
  onPress: () => void;
}

export function PersonCard({ person, onPress }: PersonCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {person.foto_uri ? (
        <Image source={{ uri: person.foto_uri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Ionicons name="person" size={28} color="#9ca3af" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{fullName(person)}</Text>
        <Text style={styles.dates}>{lifespan(person)}</Text>
        {person.geburtsort ? <Text style={styles.place}>{person.geburtsort}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#c0c0c0" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eee',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dates: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  place: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
});
