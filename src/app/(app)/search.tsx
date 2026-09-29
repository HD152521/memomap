import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PlaceCandidate } from '@/features/places/naverLocal';
import { PLACE_QUERY_MIN_LENGTH, usePlaceSearch } from '@/features/places/searchPlaces';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

const DEBOUNCE_MS = 300;

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const [text, setText] = useState('');
  const query = useDebounced(text, DEBOUNCE_MS);
  const { data: places = [], isFetching, error } = usePlaceSearch(query);
  const isQueryTooShort = query.trim().length < PLACE_QUERY_MIN_LENGTH;

  const selectPlace = (place: PlaceCandidate) => {
    router.push({
      pathname: '/memo/new',
      params: { lat: String(place.lat), lng: String(place.lng), title: place.name, address: place.address ?? '' },
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder="가게 이름 + 동네 (예: 스타벅스 강남)"
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        style={styles.input}
        accessibilityLabel="장소 검색어"
      />
      {isFetching && <ActivityIndicator style={styles.status} color={colors.accent} />}
      {error && <Text style={[styles.status, styles.error]}>{error.userMessage}</Text>}
      {!isFetching && !error && !isQueryTooShort && places.length === 0 && <Text style={styles.status}>검색 결과가 없어요. 동네 이름을 함께 입력해 보세요.</Text>}
      <FlatList
        data={places}
        keyExtractor={(place) => `${place.name}-${place.lat}-${place.lng}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => selectPlace(item)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <Text style={styles.name}>{item.name}</Text>
            {item.address && <Text style={styles.address}>{item.address}</Text>}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  status: { marginTop: spacing.lg, textAlign: 'center', color: colors.inkMuted },
  error: { color: colors.danger },
  row: { paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  rowPressed: { backgroundColor: colors.line },
  name: { fontSize: fontSize.body + 1, fontWeight: '600', color: colors.ink },
  address: { marginTop: 2, fontSize: fontSize.caption + 1, color: colors.inkMuted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
