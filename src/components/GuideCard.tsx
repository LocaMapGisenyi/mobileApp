import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Surface, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { Guide, RootStackParamList } from '../types';
import { useTranslation } from 'react-i18next';

interface GuideCardProps {
  guide: Guide;
  style?: object;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

const GuideCard: React.FC<GuideCardProps> = ({
  guide,
  style,
  size = 'medium',
  onPress: onPressProp
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = Dimensions.get('window');
  const { t } = useTranslation();
  
  // Calculer la largeur de la carte en fonction de la taille
  const getCardWidth = () => {
    switch (size) {
      case 'small':
        return width * 0.4;
      case 'large':
        return width * 0.9;
      case 'medium':
      default:
        return width * 0.65;
    }
  };
  
  // Déterminer si le guide est nouveau (moins de 15 jours)
  const isRecent = () => {
    if (!guide.isNew) return false;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(guide.createdAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 15;
  };
  
  // Naviguer vers le détail du guide
  const handlePress = () => {
    if (onPressProp) {
      onPressProp();
    } else {
      navigation.navigate('GuideDetail', { guideId: guide.id });
    }
  };
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={handlePress}
      style={[
        styles.container,
        { width: getCardWidth() },
        style
      ]}
    >
      <Surface style={styles.card}>
        {/* Image du guide */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: guide.image }} 
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Badge "Nouveau" si le guide est récent */}
          {isRecent() && (
            <Badge style={styles.newBadge}>{t('common.new')}</Badge>
          )}
        </View>
        
        {/* Contenu texte */}
        <View style={styles.content}>
          <Text 
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {guide.title}
          </Text>
          
          <Text 
            style={styles.summary}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {guide.summary}
          </Text>
          
          <View style={styles.footer}>
            <View style={styles.readMore}>
              <Text style={styles.readMoreText}>{t('guides.readMore')}</Text>
              <Ionicons 
                name="arrow-forward" 
                size={14} 
                color={colors.primary}
                style={styles.arrowIcon}
              />
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: spacing[4],
    marginBottom: spacing[4],
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    height: 140,
    width: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: typography.fontSize.xs,
  },
  content: {
    padding: spacing[3],
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing[1],
  },
  summary: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[2],
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.primary,
  },
  arrowIcon: {
    marginLeft: 4,
  },
});

export default GuideCard; 