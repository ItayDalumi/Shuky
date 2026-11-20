import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CATEGORIES } from '@/data/categories';
import type { Category } from '@/data/types';

export type CategoryArtProps = {
  category: Category;
  /** Real photo, when the seller uploaded one */
  photoUri?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Product visual: the seller's photo, or a soft category illustration as a placeholder. */
export function CategoryArt({ category, photoUri, iconSize = 44, style }: CategoryArtProps) {
  const { Icon, color, background } = CATEGORIES[category];
  return (
    <View style={[styles.base, { backgroundColor: background }, style]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Icon size={iconSize} color={color} strokeWidth={1.5} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
