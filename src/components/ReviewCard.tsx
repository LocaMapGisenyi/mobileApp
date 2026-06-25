import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Divider, Surface, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '../types';
import RatingStars from './RatingStars';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const STAR_COLOR = '#FFB100';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ReviewCardProps {
  review: Review;
  isExpanded?: boolean;
  onPress?: () => void;
  onReply?: (text: string) => void;
  isOwner?: boolean;
  style?: object;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  isExpanded = false,
  onPress,
  onReply,
  isOwner = false,
  style,
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Formater la date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Déterminer si le commentaire est long
  const isLongComment = review.comment.length > 150;
  
  // Gérer le clic sur la carte d'avis
  const handlePress = () => {
    if (isLongComment) {
      setExpanded(!expanded);
    }
    
    if (onPress) {
      onPress();
    }
  };
  
  // Gérer la soumission d'une réponse
  const handleReplySubmit = () => {
    if (onReply && replyText.trim()) {
      onReply(replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  return (
    <Surface style={[styles.card, style]}>
      <TouchableOpacity
        activeOpacity={isLongComment ? 0.7 : 1}
        onPress={handlePress}
        style={styles.container}
      >
        {/* En-tête avec avatar et informations d'auteur */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {review.authorAvatar ? (
              <Image
                source={{ uri: review.authorAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Ionicons name="person" size={24} color={colors.white} />
              </View>
            )}
          </View>
          
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {review.authorName}
              {review.isVerified && (
                <Text style={styles.verifiedBadge}> ✓ </Text>
              )}
            </Text>
            <Text style={styles.dateText}>{formatDate(review.date)}</Text>
          </View>
          
          <RatingStars
            rating={review.rating}
            size={16}
            disabled={true}
            color={STAR_COLOR}
          />
        </View>
        
        {/* Badge de type de séjour */}
        {review.stayDuration && (
          <View style={styles.stayTypeContainer}>
            <Ionicons 
              name={review.stayDuration === 'long terme' ? 'home' : 'bed'} 
              size={12} 
              color={colors.gray[600]} 
            />
            <Text style={styles.stayTypeText}>
              {review.stayDuration === 'long terme' ? 'Séjour long terme' : 'Court séjour'}
            </Text>
          </View>
        )}
        
        {/* Contenu du commentaire */}
        <View style={styles.content}>
          <Text style={styles.comment} numberOfLines={expanded ? undefined : 3}>
            {review.comment}
          </Text>
          
          {isLongComment && !expanded && (
            <Text style={styles.readMore}>Lire la suite</Text>
          )}
        </View>
        
        {/* Réponse du propriétaire si présente */}
        {review.ownerReply && (
          <Animated.View 
            entering={FadeIn.duration(300)} 
            style={styles.replyContainer}
          >
            <Divider style={styles.divider} />
            <Text style={styles.replyHeader}>Réponse du propriétaire:</Text>
            <Text style={styles.replyText}>{review.ownerReply.text}</Text>
            <Text style={styles.replyDate}>{formatDate(review.ownerReply.date)}</Text>
          </Animated.View>
        )}
        
        {/* Bouton de réponse pour le propriétaire */}
        {isOwner && !review.ownerReply && !showReplyForm && (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setShowReplyForm(true)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            <Text style={styles.replyButtonText}>Répondre</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing[2],
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  container: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avatarContainer: {
    marginRight: spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    backgroundColor: colors.gray[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[800],
  },
  verifiedBadge: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  stayTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  stayTypeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginLeft: 4,
  },
  content: {
    marginBottom: spacing[2],
  },
  comment: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.gray[800],
  },
  readMore: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  divider: {
    marginVertical: spacing[2],
  },
  replyContainer: {
    marginTop: spacing[1],
  },
  replyHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing[1],
  },
  replyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontStyle: 'italic',
    lineHeight: 18,
  },
  replyDate: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing[1],
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  replyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginLeft: 4,
  },
});

export default ReviewCard; 