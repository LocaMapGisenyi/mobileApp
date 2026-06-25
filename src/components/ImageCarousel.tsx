import React, { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, Image, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';

const DEFAULT_IMAGE = require('../assets/images/house-logo.png');

interface ImageCarouselProps {
  images: (string | number)[];
  height?: number;
  autoPlay?: boolean;
  showPagination?: boolean;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 250,
}) => {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<any>(null);

  const displayImages = images.length > 0 ? images : [DEFAULT_IMAGE];

  return (
    <View style={styles.container}>
      {/* Carousel d'images */}
      <Carousel
        ref={carouselRef}
        loop
        width={screenWidth}
        height={height}
        autoPlay={false}
        data={displayImages}
        scrollAnimationDuration={500}
        onScrollEnd={(index) => setActiveIndex(index)}
        renderItem={({ item, index }) => (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.itemContainer}
          >
            <Image
              source={typeof item === 'number' ? item : { uri: item }}
              style={styles.image}
              resizeMode="cover"
            />
          </Animated.View>
        )}
      />

      {/* Indicateurs de pagination */}
      <View style={styles.pagination}>
        {displayImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              activeIndex === index && { 
                width: 20, 
                backgroundColor: theme.colors.primary 
              },
            ]}
          />
        ))}
      </View>

      {/* Indicateur de nombre d'images */}
      <View style={styles.counter}>
        <MaterialIcons name="collections" size={18} color="#fff" />
        <Text style={styles.counterText}>
          {activeIndex + 1} / {displayImages.length}
        </Text>
      </View>

      {/* Boutons de navigation */}
      {displayImages.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => {
              const prevIndex = activeIndex === 0 ? displayImages.length - 1 : activeIndex - 1;
              carouselRef.current?.scrollTo({ index: prevIndex, animated: true });
            }}
          >
            <MaterialIcons name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={() => {
              const nextIndex = activeIndex === displayImages.length - 1 ? 0 : activeIndex + 1;
              carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
            }}
          >
            <MaterialIcons name="chevron-right" size={32} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  itemContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  counter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    marginTop: -20,
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
});

export default ImageCarousel; 