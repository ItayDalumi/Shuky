import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CATEGORIES } from '@/data/categories';
import { BakeryArt } from './BakeryArt';
import type { Category } from '@/data/types';

export type CategoryArtProps = {
  category: Category;
  /** Real photo, when the seller uploaded one */
  photoUri?: string;
  /** Size of the illustration when there's no photo */
  artSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Product visual: the seller's photo, or a bakery illustration as a placeholder. */
export function CategoryArt({ category, photoUri, artSize = 92, style }: CategoryArtProps) {
  const { background } = CATEGORIES[category];
  return (
    <View style={[styles.base, { backgroundColor: background }, style]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <BakeryArt category={category} size={artSize} background={background} />
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
