import React, { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Image from './ResilientImage';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Carousel, type CarouselRef } from 'react-native-reanimated-carousel';
import { colors } from '../theme';

const DEFAULT_IMAGE = require('../assets/images/house-logo.png');

interface ImageCarouselProps {
  images: (string | number)[];
  height?: number;
  autoPlay?: boolean;
  showPagination?: boolean;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, height = 250, autoPlay = false, showPagination = true }) => {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<CarouselRef>(null);
  const displayImages = images.length > 0 ? images : [DEFAULT_IMAGE];
  const currentIndex = Math.min(activeIndex, displayImages.length - 1);
  const multiple = displayImages.length > 1;
  const move = (step: number) => {
    carouselRef.current?.scrollTo({ index: (currentIndex + step + displayImages.length) % displayImages.length, animated: true });
  };

  return (
    <View style={styles.container} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {width > 0 && <Carousel
          ref={carouselRef}
          loop={multiple}
          style={{ width, height }}
          itemSize={width}
          autoplay={autoPlay && multiple}
          data={displayImages}
          animation={{ type: 'timing', duration: 250 }}
          onSnapToItem={setActiveIndex}
          renderItem={({ item, index }) => (
            <Image
              source={typeof item === 'number' ? item : { uri: item }}
              accessibilityLabel={`Photo du logement ${index + 1} sur ${displayImages.length}`}
              style={{ width, height }}
              resizeMode="contain"
            />
          )}
        />}
      </View>
      {multiple && showPagination && <View style={styles.controls}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Photo précédente" style={styles.navButton} onPress={() => move(-1)}>
          <MaterialIcons name="chevron-left" size={28} color={colors.ink} />
        </TouchableOpacity>
        <Text accessibilityLiveRegion="polite" style={styles.counter}>{currentIndex + 1} / {displayImages.length}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Photo suivante" style={styles.navButton} onPress={() => move(1)}>
          <MaterialIcons name="chevron-right" size={28} color={colors.ink} />
        </TouchableOpacity>
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.surface },
  counter: { color: colors.inkMid, fontSize: 14, fontWeight: '600' },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default ImageCarousel;
