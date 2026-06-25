import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Share,
  Linking
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';
import { Text, Button, Chip, IconButton, Divider, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ImageCarousel from '../components/ImageCarousel';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { colors } from '../theme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type PropertyDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PropertyDetails'>;
type PropertyDetailsRouteProp = RouteProp<RootStackParamList, 'PropertyDetails'>;

const PropertyDetailsScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<PropertyDetailsRouteProp>();
  const navigation = useNavigation<PropertyDetailsScreenNavigationProp>();
  const { propertyId } = route.params;
  const { properties, selectedProperty, selectProperty, user, addToFavorites, removeFromFavorites } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  
  const [visibleSnackbar, setVisibleSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    selectProperty(propertyId);
    StatusBar.setBarStyle('light-content');
    
    return () => {
      StatusBar.setBarStyle('dark-content');
    };
  }, [propertyId, selectProperty]);

  if (!selectedProperty) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('property.loading')}</Text>
      </View>
    );
  }

  const isFavorite = user?.favorites?.includes(propertyId);

  const handleToggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(propertyId);
      showSnackbar(t('property.removedFromFavorites'));
    } else {
      addToFavorites(propertyId);
      showSnackbar(t('property.addedToFavorites'));
    }
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setVisibleSnackbar(true);
  };
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('property.checkOut')} ${selectedProperty.title} - ${selectedProperty.location?.city}`,
        url: 'https://locamap.app/property/' + propertyId,
      });
    } catch (error) {
      console.error('Error sharing property:', error);
    }
  };
  
  const handleContactOwner = () => {
    if (user && selectedProperty.owner) {
      navigation.navigate('NewMessage', {
        propertyId,
        propertyTitle: selectedProperty.title,
        ownerId: selectedProperty.owner.id,
        ownerName: selectedProperty.owner.name,
        ownerAvatar: selectedProperty.owner.avatar || '',
      });
    } else {
      showSnackbar(t('property.loginToContact'));
    }
  };
  
  const handleCall = () => {
    if (selectedProperty.contactPhone) {
      Linking.openURL(`tel:${selectedProperty.contactPhone}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ImageCarousel 
            images={selectedProperty.images.length > 0 
              ? selectedProperty.images 
              : ['https://via.placeholder.com/600x400?text=No+Image']} 
            autoPlay={false}
            showPagination={true}
            height={350}
          />
          
          <View style={styles.headerButtonsContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            
            <View style={styles.rightButtons}>
              <TouchableOpacity 
                style={styles.headerRoundButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={22} color={colors.white} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerRoundButton}
                onPress={handleToggleFavorite}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isFavorite ? colors.error : colors.white} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Property Info */}
        <Animated.View 
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.propertyInfoContainer}
        >
          <Text style={styles.propertyTitle}>{selectedProperty.title}</Text>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={18} color={colors.gray[500]} />
            <Text style={styles.locationText}>
              {selectedProperty.location?.district && `${selectedProperty.location?.district}, `}
              {selectedProperty.location?.city}
            </Text>
          </View>
          
          {selectedProperty.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={styles.ratingText}>
                {selectedProperty.rating.toFixed(1)}
                {selectedProperty.reviews && (
                  <Text style={styles.reviewsText}> · {selectedProperty.reviews} {t('property.reviews')}</Text>
                )}
              </Text>
            </View>
          )}
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              {selectedProperty.price} {selectedProperty.currency}
              <Text style={styles.priceUnit}> / {t('property.month')}</Text>
            </Text>
          </View>
        </Animated.View>
        
        <Divider style={styles.divider} />
        
        {/* Features */}
        <Animated.View 
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.featuresSection}
        >
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="bed-outline" size={24} color={colors.gray[700]} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureValue}>{selectedProperty.bedrooms || 0}</Text>
              <Text style={styles.featureLabel}>{t('property.bedrooms')}</Text>
            </View>
          </View>
          
          <View style={styles.featureDivider} />
          
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="water-outline" size={24} color={colors.gray[700]} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureValue}>{selectedProperty.bathrooms || 0}</Text>
              <Text style={styles.featureLabel}>{t('property.bathrooms')}</Text>
            </View>
          </View>
          
          <View style={styles.featureDivider} />
          
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="floor-plan" size={24} color={colors.gray[700]} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureValue}>{selectedProperty.surface || selectedProperty.size || 0} m²</Text>
              <Text style={styles.featureLabel}>{t('property.surface')}</Text>
            </View>
          </View>
        </Animated.View>
        
        <Divider style={styles.divider} />
        
        {/* Description */}
        <Animated.View 
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{t('property.description')}</Text>
          <Text style={styles.descriptionText}>
            {selectedProperty.description || t('property.noDescription')}
          </Text>
        </Animated.View>
        
        <Divider style={styles.divider} />
        
        {/* Amenities */}
        {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
          <Animated.View 
            entering={FadeInDown.duration(500).delay(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{t('property.amenities')}</Text>
            <View style={styles.amenitiesContainer}>
              {selectedProperty.amenities.map((amenity, index) => (
                <Chip 
                  key={index} 
                  style={styles.amenityChip}
                  textStyle={styles.amenityChipText}
                  icon={() => <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />}
                >
                  {amenity}
                </Chip>
              ))}
            </View>
          </Animated.View>
        )}
        
        {/* Owner/Contact Info */}
        <Animated.View 
          entering={FadeInDown.duration(500).delay(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{t('property.contact')}</Text>
          
          <View style={styles.ownerCard}>
            <View style={styles.ownerInfo}>
              {selectedProperty.owner?.avatar ? (
                <View style={styles.ownerAvatarContainer}>
                  <Animated.Image 
                    source={{ uri: selectedProperty.owner.avatar }}
                    style={styles.ownerAvatar}
                    entering={FadeIn.duration(300)}
                  />
                </View>
              ) : (
                <View style={[styles.ownerAvatarContainer, styles.ownerAvatarPlaceholder]}>
                  <Ionicons name="person" size={30} color={colors.gray[500]} />
                </View>
              )}
              
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>
                  {selectedProperty.owner?.name || selectedProperty.contactInfo?.name || t('property.propertyOwner')}
                </Text>
                {selectedProperty.contactPhone && (
                  <Text style={styles.ownerContact}>
                    {selectedProperty.contactPhone}
                  </Text>
                )}
                {selectedProperty.contactEmail && (
                  <Text style={styles.ownerContact}>
                    {selectedProperty.contactEmail}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Bottom Action Buttons */}
      <Animated.View 
        entering={SlideInRight.duration(500)}
        style={styles.bottomBar}
      >
        {selectedProperty.contactPhone && (
          <TouchableOpacity 
            style={styles.callButton}
            onPress={handleCall}
          >
            <Ionicons name="call-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
        
        <Button
          mode="contained"
          style={styles.contactButton}
          contentStyle={styles.contactButtonContent}
          labelStyle={styles.contactButtonLabel}
          loading={loadingAction}
          onPress={handleContactOwner}
        >
          {t('property.contactOwner')}
        </Button>
      </Animated.View>
      
      {/* Snackbar */}
      <Snackbar
        visible={visibleSnackbar}
        onDismiss={() => setVisibleSnackbar(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100, // Space for bottom bar
  },
  imageContainer: {
    position: 'relative',
    height: 350,
    backgroundColor: colors.black,
  },
  headerButtonsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
  },
  headerRoundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  propertyInfoContainer: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: colors.gray[500],
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[700],
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 15,
    fontWeight: 'normal',
    color: colors.gray[500],
  },
  priceContainer: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.gray[500],
  },
  divider: {
    backgroundColor: colors.gray[200],
    height: 1,
    marginVertical: 16,
  },
  featuresSection: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[800],
  },
  featureLabel: {
    fontSize: 14,
    color: colors.gray[500],
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[600],
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityChip: {
    backgroundColor: colors.gray[100],
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
  },
  amenityChipText: {
    color: colors.gray[700],
  },
  ownerCard: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  ownerAvatarPlaceholder: {
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 4,
  },
  ownerContact: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  contactButtonContent: {
    height: 50,
  },
  contactButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[500],
  },
  snackbar: {
    backgroundColor: colors.black,
    position: 'absolute',
    bottom: 90,
  },
});

export default PropertyDetailsScreen; 