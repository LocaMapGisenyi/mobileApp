import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface RatingStarsProps {
  rating?: number;
  size?: number;
  maxRating?: number;
  color?: string;
  disabled?: boolean;
  showValue?: boolean;
  precision?: 'half' | 'full';
  onRatingChange?: (rating: number) => void;
  style?: object;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating = 0,
  size = 20,
  maxRating = 5,
  color = colors.primary,
  disabled = false,
  showValue = false,
  precision = 'half',
  onRatingChange,
  style,
}) => {
  const [selectedRating, setSelectedRating] = useState(rating);
  const [tempRating, setTempRating] = useState(0);
  
  // Déterminer si le composant est en mode lecture seule
  const isReadOnly = disabled || !onRatingChange;
  
  // Gérer le changement de note
  const handleRatingChange = (value: number) => {
    if (isReadOnly) return;
    
    setSelectedRating(value);
    setTempRating(0);
    
    if (onRatingChange) {
      onRatingChange(value);
    }
  };
  
  // Gérer le survol des étoiles
  const handleStarHover = (value: number) => {
    if (isReadOnly) return;
    setTempRating(value);
  };
  
  // Récupérer la note actuelle (temporaire lors du survol ou sélectionnée)
  const getCurrentRating = () => {
    return tempRating > 0 ? tempRating : selectedRating;
  };
  
  // Générer les étoiles
  const renderStars = () => {
    const stars = [];
    const currentRating = getCurrentRating();
    
    for (let i = 1; i <= maxRating; i++) {
      // Déterminer le type d'étoile à afficher
      let iconName: string;
      if (i <= Math.floor(currentRating)) {
        iconName = 'star'; // Étoile pleine
      } else if (precision === 'half' && i <= Math.ceil(currentRating) && i - 0.5 <= currentRating) {
        iconName = 'star-half'; // Demi-étoile
      } else {
        iconName = 'star-outline'; // Étoile vide
      }
      
      stars.push(
        <TouchableOpacity
          key={i}
          activeOpacity={isReadOnly ? 1 : 0.7}
          onPress={() => handleRatingChange(i)}
          onPressIn={() => handleStarHover(i)}
          onPressOut={() => handleStarHover(0)}
          disabled={isReadOnly}
          style={styles.starButton}
        >
          <Ionicons name={iconName as any} size={size} color={color} />
        </TouchableOpacity>
      );
    }
    
    return stars;
  };
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      
      {showValue && (
        <Text style={[styles.ratingText, { fontSize: size * 0.8 }]}>
          {selectedRating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: colors.gray[700],
  },
});

export default RatingStars; 