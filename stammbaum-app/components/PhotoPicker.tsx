import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface PhotoPickerProps {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

export function PhotoPicker({ uri, onChange }: PhotoPickerProps) {
  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Zugriff benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Zugriff benötigt', 'Bitte erlaube den Zugriff auf die Kamera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.previewWrapper}>
        {uri ? (
          <Image source={{ uri }} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewPlaceholder]}>
            <Ionicons name="person" size={40} color="#9ca3af" />
          </View>
        )}
        {uri ? (
          <Pressable style={styles.removeButton} onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={18} color="#2f6f4f" />
          <Text style={styles.buttonText}>Kamera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pickFromLibrary}>
          <Ionicons name="images-outline" size={18} color="#2f6f4f" />
          <Text style={styles.buttonText}>Galerie</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  previewWrapper: {
    position: 'relative',
  },
  preview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eee',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eaf4ee',
  },
  buttonText: {
    color: '#2f6f4f',
    fontWeight: '600',
    fontSize: 13,
  },
});
