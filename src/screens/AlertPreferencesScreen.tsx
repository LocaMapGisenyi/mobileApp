import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  TextInput,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  MaterialIcons, 
  FontAwesome5 
} from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { 
  Divider, 
  Chip, 
  Snackbar,
  SegmentedButtons,
  Avatar
} from 'react-native-paper';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useTranslation } from 'react-i18next';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeInRight,
  FadeIn
} from 'react-native-reanimated';

// Types
import { RootStackParamList } from '../types';
import { PropertyType, Amenity } from '../types/index';

// State
import { useAlertsStore, Alert } from '../store/alerts';

type AlertPreferencesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Duration options
const durationOptions = [
  { key: 'any', label: 'durationOptions.anyDuration', value: 0 },
  { key: 'oneWeek', label: 'durationOptions.oneWeek', value: 7 },
  { key: 'oneMonth', label: 'durationOptions.oneMonth', value: 30 },
  { key: 'threeMonths', label: 'durationOptions.threeMonths', value: 90 },
  { key: 'sixMonths', label: 'durationOptions.sixMonths', value: 180 },
  { key: 'oneYear', label: 'durationOptions.oneYear', value: 365 },
];

// Property types with icons
const propertyTypesWithIcons = [
  { type: PropertyType.APARTMENT, icon: 'apartment', label: 'property.types.apartment' },
  { type: PropertyType.HOUSE, icon: 'home', label: 'property.types.house' },
  { type: PropertyType.VILLA, icon: 'home-variant', label: 'property.types.villa' },
  { type: PropertyType.STUDIO, icon: 'studio-monitor', label: 'property.types.studio' },
  { type: PropertyType.ROOM, icon: 'bed-empty', label: 'property.types.room' },
];

// Amenities with icons
const amenitiesWithIcons = [
  { amenity: Amenity.WIFI, icon: 'wifi', label: 'alerts.amenities.wifi' },
  { amenity: Amenity.AC, icon: 'snowflake', label: 'alerts.amenities.aircon' },
  { amenity: Amenity.KITCHEN, icon: 'silverware-fork-knife', label: 'alerts.amenities.kitchen' },
  { amenity: Amenity.WASHING_MACHINE, icon: 'washing-machine', label: 'alerts.amenities.washingMachine' },
  { amenity: Amenity.PARKING, icon: 'car', label: 'alerts.amenities.parking' },
  { amenity: Amenity.LAKE_VIEW, icon: 'waves', label: 'alerts.amenities.lakeView' },
];

const AlertPreferencesScreen: React.FC = () => {
  const navigation = useNavigation<AlertPreferencesScreenNavigationProp>();
  const { createAlert, notificationsEnabled, toggleNotifications } = useAlertsStore();
  const { t } = useTranslation();
  
  // States for criteria
  const [alertName, setAlertName] = useState(t('alerts.alertNamePlaceholder'));
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([200, 600]);
  const [minDuration, setMinDuration] = useState<number>(0);
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [matchingProperties, setMatchingProperties] = useState<number | null>(null);
  
  // Districts data
  const districts = [
    { id: 'lakeSide', label: t('alerts.districtNames.lakeSide') },
    { id: 'downtown', label: t('alerts.districtNames.downtown') },
    { id: 'rubavu', label: t('alerts.districtNames.rubavu') },
    { id: 'campus', label: t('alerts.districtNames.campus') },
    { id: 'gisenyiRural', label: t('alerts.districtNames.gisenyiRural') },
    { id: 'northBeach', label: t('alerts.districtNames.northBeach') },
    { id: 'mbugangari', label: t('alerts.districtNames.mbugangari') }
  ];
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return `${amount} USD`;
  };
  
  // Toggle property type
  const togglePropertyType = (type: PropertyType) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Toggle amenity
  const toggleAmenity = (amenity: Amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };
  
  // Toggle district
  const toggleDistrict = (district: string) => {
    setSelectedDistricts(prev => 
      prev.includes(district)
        ? prev.filter(d => d !== district)
        : [...prev, district]
    );
  };
  
  // Create alert and save preferences
  const handleSavePreferences = () => {
    const newAlert: Omit<Alert, 'id'> = {
      name: alertName,
      enabled: true,
      criteria: {
        propertyTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        minBedrooms: 1,
        maxBedrooms: 5,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        districts: selectedDistricts.length > 0 ? selectedDistricts : undefined,
      }
    };
    
    createAlert(newAlert);
    setSnackbarVisible(true);
    
    // Simulate calculating the number of properties matching these criteria
    // In a real app, this would query your backend
    const simulatedCount = Math.floor(Math.random() * 20);
    setMatchingProperties(simulatedCount);
  };
  
  // Mock function to dismiss the snackbar
  const onDismissSnackBar = () => setSnackbarVisible(false);
  
  // Effect to simulate loading matching properties
  useEffect(() => {
    // In a real app, this would be a backend call
    const timeout = setTimeout(() => {
      const simulatedCount = Math.floor(Math.random() * 20);
      setMatchingProperties(simulatedCount);
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [selectedTypes, priceRange, selectedAmenities, selectedDistricts]);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(300)} 
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('alerts.title')}</Text>
        <View style={styles.headerRight} />
      </Animated.View>
      
      <Divider />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert name */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.alertName')}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={alertName}
            onChangeText={setAlertName}
            placeholder={t('alerts.alertNamePlaceholder')}
            placeholderTextColor={colors.gray[400]}
          />
        </Animated.View>
        
        {/* Property Type */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.propertyType')}</Text>
          </View>
          <View style={styles.propertyTypesContainer}>
            {propertyTypesWithIcons.map((item, index) => (
              <AnimatedTouchableOpacity
                key={item.type}
                entering={FadeInRight.delay(300 + index * 100).duration(400)}
                style={[
                  styles.propertyTypeItem,
                  selectedTypes.includes(item.type) && styles.propertyTypeItemSelected
                ]}
                onPress={() => togglePropertyType(item.type)}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={28}
                  color={selectedTypes.includes(item.type) ? colors.white : colors.gray[600]}
                />
                <Text 
                  style={[
                    styles.propertyTypeText,
                    selectedTypes.includes(item.type) && styles.propertyTypeTextSelected
                  ]}
                >
                  {t(item.label)}
                </Text>
              </AnimatedTouchableOpacity>
            ))}
          </View>
        </Animated.View>
        
        {/* Price Range */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.priceRange')}</Text>
            <Text style={styles.priceRangeText}>
              {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
            </Text>
          </View>
          <View style={styles.sliderContainer}>
            {/* Min price slider */}
            <Text style={styles.sliderLabel}>{t('search.minPrice')}</Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={900}
              step={50}
              value={priceRange[0]}
              onValueChange={(value) => setPriceRange([value, Math.max(value + 100, priceRange[1])])}
              minimumTrackTintColor={colors.gray[300]}
              maximumTrackTintColor={colors.gray[300]}
              thumbTintColor={colors.primary}
            />
            
            {/* Max price slider */}
            <Text style={styles.sliderLabel}>{t('search.maxPrice')}</Text>
            <Slider
              style={styles.slider}
              minimumValue={priceRange[0] + 100}
              maximumValue={2000}
              step={50}
              value={priceRange[1]}
              onValueChange={(value) => setPriceRange([priceRange[0], value])}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.gray[300]}
              thumbTintColor={colors.primary}
            />
          </View>
        </Animated.View>
        
        {/* Minimum Duration */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.minDuration')}</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationOptionsContainer}
          >
            {durationOptions.map((option, index) => (
              <AnimatedTouchableOpacity
                key={option.key}
                entering={FadeInRight.delay(500 + index * 100).duration(400)}
                style={[
                  styles.durationOption,
                  minDuration === option.value && styles.durationOptionSelected
                ]}
                onPress={() => setMinDuration(option.value)}
              >
                <Text 
                  style={[
                    styles.durationOptionText,
                    minDuration === option.value && styles.durationOptionTextSelected
                  ]}
                >
                  {t(option.label)}
                </Text>
              </AnimatedTouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
        
        {/* Amenities */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.amenities.title')}</Text>
          </View>
          <View style={styles.amenitiesContainer}>
            {amenitiesWithIcons.map((item, index) => (
              <AnimatedTouchableOpacity
                key={item.amenity}
                entering={FadeInRight.delay(600 + index * 100).duration(400)}
                style={[
                  styles.amenityItem,
                  selectedAmenities.includes(item.amenity) && styles.amenityItemSelected
                ]}
                onPress={() => toggleAmenity(item.amenity)}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={selectedAmenities.includes(item.amenity) ? colors.white : colors.gray[600]}
                  style={styles.amenityIcon}
                />
                <Text 
                  style={[
                    styles.amenityText,
                    selectedAmenities.includes(item.amenity) && styles.amenityTextSelected
                  ]}
                >
                  {t(item.label)}
                </Text>
              </AnimatedTouchableOpacity>
            ))}
          </View>
        </Animated.View>
        
        {/* Districts */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(400)} 
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('alerts.districts')}</Text>
          </View>
          <View style={styles.districtsContainer}>
            {districts.map((district, index) => (
              <Chip
                key={district.id}
                selected={selectedDistricts.includes(district.id)}
                onPress={() => toggleDistrict(district.id)}
                style={[
                  styles.districtChip,
                  selectedDistricts.includes(district.id) && styles.districtChipSelected
                ]}
                textStyle={[
                  styles.districtChipText,
                  selectedDistricts.includes(district.id) && styles.districtChipTextSelected
                ]}
                mode="outlined"
                showSelectedCheck={false}
                elevation={0}
              >
                {district.label}
              </Chip>
            ))}
          </View>
        </Animated.View>
        
        {/* Toggle notifications */}
        <Animated.View 
          entering={FadeInDown.delay(700).duration(400)} 
          style={styles.toggleContainer}
        >
          <View style={styles.toggleInfo}>
            <MaterialIcons name="notifications" size={24} color={colors.gray[700]} />
            <Text style={styles.toggleText}>{t('preferences.receiveNotifications')}</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.gray[300], true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.gray[300]}
          />
        </Animated.View>
      </ScrollView>
      
      {/* Footer with Create Button */}
      <Animated.View 
        entering={FadeInUp.duration(400)} 
        style={styles.footer}
      >
        {/* Display matching properties count if available */}
        {matchingProperties !== null && (
          <Animated.View 
            entering={FadeIn.duration(400)} 
            style={styles.matchingPropertiesContainer}
          >
            <Text style={styles.matchingPropertiesText}>
              {matchingProperties === 0 
                ? t('alerts.noAvailableProperties')
                : matchingProperties === 1
                  ? t('alerts.availablePropertiesSingular')
                  : t('alerts.availableProperties', { count: matchingProperties })}
            </Text>
          </Animated.View>
        )}
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSavePreferences}
        >
          <Text style={styles.saveButtonText}>
            {t('alerts.savePreferences')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={onDismissSnackBar}
        duration={3000}
        style={styles.snackbar}
      >
        {t('alerts.preferencesUpdated')}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[10],
  },
  section: {
    marginTop: spacing[5],
    paddingHorizontal: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.black,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.black,
    backgroundColor: colors.white,
  },
  
  // Property types styles
  propertyTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  propertyTypeItem: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '30%',
    marginHorizontal: '1.5%',
    marginBottom: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  propertyTypeItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  propertyTypeText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
    textAlign: 'center',
  },
  propertyTypeTextSelected: {
    color: colors.white,
  },
  
  // Price range styles
  priceRangeText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  sliderContainer: {
    marginTop: spacing[2],
  },
  sliderLabel: {
    marginBottom: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: spacing[3],
  },
  
  // Duration options styles
  durationOptionsContainer: {
    flexDirection: 'row',
    paddingRight: spacing[4],
  },
  durationOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginRight: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  durationOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  durationOptionTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  
  // Amenities styles
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    marginHorizontal: '1.5%',
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  amenityItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amenityIcon: {
    marginRight: spacing[2],
  },
  amenityText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  amenityTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  
  // Districts styles
  districtsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  districtChip: {
    margin: spacing[1],
    backgroundColor: colors.white,
  },
  districtChipSelected: {
    backgroundColor: colors.primary,
  },
  districtChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  districtChipTextSelected: {
    color: colors.white,
  },
  
  // Toggle notifications styles
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[5],
    marginHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
  },
  
  // Footer styles
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[3],
    backgroundColor: colors.white,
  },
  matchingPropertiesContainer: {
    alignItems: 'center',
    paddingBottom: spacing[2],
  },
  matchingPropertiesText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  
  // Snackbar styles
  snackbar: {
    backgroundColor: colors.black,
  },
});

export default AlertPreferencesScreen; 