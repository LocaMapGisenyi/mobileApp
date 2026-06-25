import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  useTheme,
  HelperText,
  Checkbox,
  Divider,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NewListingFormData, useHostListingsStore } from '../store/hostListings';
import { useUserStore } from '../store/user';
import { colors } from '../theme';

type CreateListingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateListing'>;

// Liste des types de propriétés disponibles
const PROPERTY_TYPES = [
  { label: 'Appartement', value: 'appartement' },
  { label: 'Maison', value: 'maison' },
  { label: 'Chambre', value: 'chambre' },
  { label: 'Villa', value: 'villa' },
  { label: 'Studio', value: 'studio' },
];

// Liste des commodités disponibles
const AMENITIES = [
  { label: 'Wi-Fi', value: 'WiFi' },
  { label: 'Parking', value: 'Parking' },
  { label: 'Sécurité 24/7', value: 'Sécurité 24/7' },
  { label: 'Meublé', value: 'Meublé' },
  { label: 'Jardin', value: 'Jardin' },
  { label: 'Piscine', value: 'Piscine' },
  { label: 'Cuisine équipée', value: 'Cuisine équipée' },
  { label: 'Eau chaude', value: 'Eau chaude' },
  { label: 'Climatisation', value: 'Climatisation' },
  { label: 'Balcon', value: 'Balcon' },
  { label: 'Vue sur le lac', value: 'Vue sur le lac' },
  { label: 'Laveuse/Sécheuse', value: 'Laveuse/Sécheuse' },
  { label: 'TV', value: 'TV' },
];

const CreateListingScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<CreateListingScreenNavigationProp>();
  
  const { addListing } = useHostListingsStore();
  
  // État du formulaire
  const [formData, setFormData] = useState<NewListingFormData>({
    title: '',
    description: '',
    price: 0,
    currency: 'RWF', // Devise par défaut
    bedrooms: 1,
    bathrooms: 1,
    size: 0,
    amenities: [],
    type: 'appartement', // Type par défaut
    address: '',
    city: 'Gisenyi', // Ville par défaut
    district: '',
    images: [], // Images à ajouter
    maxGuests: 2,
    smokingAllowed: false,
    petsAllowed: false,
  });

  // Indicateurs de chargement
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [galleryPermissionGranted, setGalleryPermissionGranted] = useState(false);

  // Gestion des erreurs de validation
  const [errors, setErrors] = useState<Partial<Record<keyof NewListingFormData, string>>>({});
  
  // Gestion de l'étape actuelle du formulaire (pour un formulaire multi-étapes)
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Demander les permissions au chargement du composant
  useEffect(() => {
    requestLocationPermission();
    requestGalleryPermission();
  }, []);

  // Demander la permission d'accès à la localisation
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Permission de localisation",
            message: "LocaMap a besoin d'accéder à votre position pour localiser votre annonce.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        
        setLocationPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // Sur iOS, on simule que la permission est accordée
        setLocationPermissionGranted(true);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Demander la permission d'accès à la galerie
  const requestGalleryPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Permission d'accès aux photos",
            message: "LocaMap a besoin d'accéder à vos photos pour ajouter des images à votre annonce.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        
        setGalleryPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // Sur iOS, on simule que la permission est accordée
        setGalleryPermissionGranted(true);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Détecter automatiquement la position actuelle
  const detectCurrentLocation = () => {
    if (!locationPermissionGranted) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à la localisation pour utiliser cette fonctionnalité.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Autoriser", onPress: requestLocationPermission }
        ]
      );
      return;
    }

    setIsLoadingLocation(true);

    // Simuler la géolocalisation (dans une implémentation réelle, nous utiliserions navigator.geolocation)
    setTimeout(() => {
      // Coordonnées de Gisenyi (exemple)
      const latitude = -1.7005;
      const longitude = 29.2569;

      // Mettre à jour le formulaire avec la position détectée
      setFormData({
        ...formData,
        latitude,
        longitude,
        city: "Gisenyi", // Normalement, on ferait un reverse geocoding pour obtenir la ville
        district: "Centre-ville", // Normalement, on ferait un reverse geocoding pour obtenir le quartier
        address: "Position actuelle détectée" // Normalement, on ferait un reverse geocoding pour obtenir l'adresse
      });

      setIsLoadingLocation(false);

      // Nettoyer les erreurs de validation liées à l'adresse
      if (errors.address || errors.city || errors.district) {
        setErrors({
          ...errors,
          address: undefined,
          city: undefined,
          district: undefined
        });
      }

      Alert.alert("Position détectée", "Votre position actuelle a été utilisée pour l'adresse.");
    }, 1500);
  };

  // Ouvrir la galerie pour sélectionner des images
  const openGallery = () => {
    if (!galleryPermissionGranted) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à la galerie pour utiliser cette fonctionnalité.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Autoriser", onPress: requestGalleryPermission }
        ]
      );
      return;
    }

    // Dans une implémentation réelle, on utiliserait launchImageLibrary de react-native-image-picker
    // Simuler la sélection d'images depuis la galerie
    Alert.alert(
      "Galerie de photos",
      "Sélectionnez une option",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Prendre une photo", 
          onPress: () => {
            // Simulation d'une photo prise avec l'appareil
            const randomImage = `https://source.unsplash.com/random/800x600?room&sig=${Math.random()}`;
            handleAddImage(randomImage);
          } 
        },
        { 
          text: "Choisir depuis la galerie", 
          onPress: () => {
            // Simulation de sélection de plusieurs photos
            const numImages = Math.floor(Math.random() * 3) + 1; // 1 à 3 images
            for (let i = 0; i < numImages; i++) {
              const randomImage = `https://source.unsplash.com/random/800x600?apartment&sig=${Math.random()}`;
              handleAddImage(randomImage);
            }
          }
        }
      ]
    );
  };

  // Valider le formulaire avant soumission
  const validateForm = () => {
    const newErrors: Partial<Record<keyof NewListingFormData, string>> = {};
    
    // Validation du titre
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }
    
    // Validation de la description
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    
    // Validation du prix
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Le prix doit être supérieur à zéro';
    }
    
    // Validation de l'adresse
    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }
    
    // Validation du district/quartier
    if (!formData.district.trim()) {
      newErrors.district = 'Le quartier est requis';
    }
    
    // Validation de la taille
    if (!formData.size || formData.size <= 0) {
      newErrors.size = 'La taille doit être supérieure à zéro';
    }
    
    // Validation des images (au moins une image requise)
    if (formData.images.length === 0) {
      newErrors.images = 'Au moins une image est requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = () => {
    if (validateForm()) {
      try {
        // Ajouter la nouvelle annonce
        addListing(formData);
        
        // Afficher une confirmation
        Alert.alert(
          'Annonce publiée !',
          'Votre annonce a été publiée avec succès.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('HostDashboard')
            }
          ]
        );
      } catch (error) {
        Alert.alert(
          'Erreur',
          'Une erreur est survenue lors de la publication de l\'annonce.',
          [{ text: 'OK' }]
        );
      }
    } else {
      // Faire défiler jusqu'à la première erreur
      Alert.alert(
        'Formulaire incomplet',
        'Veuillez remplir tous les champs obligatoires.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Mettre à jour les valeurs du formulaire
  const handleChange = (field: keyof NewListingFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Effacer l'erreur si le champ est complété
    if (errors[field] && value) {
      setErrors({
        ...errors,
        [field]: undefined
      });
    }
  };

  // Gérer l'ajout d'une image
  const handleAddImage = (uri: string) => {
    setFormData({
      ...formData,
      images: [...formData.images, uri]
    });
    
    if (errors.images) {
      setErrors({
        ...errors,
        images: undefined
      });
    }
  };
  
  // Gérer la suppression d'une image
  const handleRemoveImage = (index: number) => {
    const updatedImages = [...formData.images];
    updatedImages.splice(index, 1);
    
    setFormData({
      ...formData,
      images: updatedImages
    });
    
    if (updatedImages.length === 0) {
      setErrors({
        ...errors,
        images: 'Au moins une image est requise'
      });
    }
  };
  
  // Gérer les commodités
  const handleToggleAmenity = (amenity: string) => {
    const updatedAmenities = formData.amenities.includes(amenity)
      ? formData.amenities.filter(a => a !== amenity)
      : [...formData.amenities, amenity];
    
    setFormData({
      ...formData,
      amenities: updatedAmenities
    });
  };
  
  // Structure de base du composant
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header avec bouton de retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une annonce</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Contenu principal avec le formulaire */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section des informations de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>
            
            {/* Type de propriété */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de propriété</Text>
              <SegmentedButtons
                value={formData.type}
                onValueChange={(value) => handleChange('type', value)}
                buttons={PROPERTY_TYPES.map(type => ({
                  value: type.value,
                  label: type.label,
                }))}
                style={styles.segmentedButtons}
              />
            </View>
            
            {/* Titre */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre de l'annonce</Text>
              <TextInput
                mode="outlined"
                value={formData.title}
                onChangeText={(text) => handleChange('title', text)}
                placeholder="Ex: Bel appartement moderne au centre-ville"
                outlineColor={errors.title ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.title ? theme.colors.error : theme.colors.primary}
                style={styles.input}
              />
              {errors.title && <HelperText type="error">{errors.title}</HelperText>}
            </View>
            
            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                mode="outlined"
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
                placeholder="Décrivez votre logement en détail..."
                multiline
                numberOfLines={4}
                outlineColor={errors.description ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.description ? theme.colors.error : theme.colors.primary}
                style={[styles.input, styles.textArea]}
              />
              {errors.description && <HelperText type="error">{errors.description}</HelperText>}
            </View>
          </View>
          
          {/* Section de la localisation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            
            {/* Bouton de détection de position */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={detectCurrentLocation}
              disabled={isLoadingLocation}
            >
              <MaterialIcons name="my-location" size={18} color="#FF5A5F" />
              <Text style={styles.locationButtonText}>
                {isLoadingLocation ? "Détection en cours..." : "Utiliser ma position actuelle"}
              </Text>
              {isLoadingLocation && (
                <ActivityIndicator size="small" color="#FF5A5F" style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
            
            {/* Ville */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                mode="outlined"
                value={formData.city}
                onChangeText={(text) => handleChange('city', text)}
                placeholder="Ex: Gisenyi"
                outlineColor={errors.city ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.city ? theme.colors.error : theme.colors.primary}
                style={styles.input}
              />
              {errors.city && <HelperText type="error">{errors.city}</HelperText>}
            </View>
            
            {/* Quartier / District */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Quartier</Text>
              <TextInput
                mode="outlined"
                value={formData.district}
                onChangeText={(text) => handleChange('district', text)}
                placeholder="Ex: Centre-ville, Rubavu, etc."
                outlineColor={errors.district ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.district ? theme.colors.error : theme.colors.primary}
                style={styles.input}
              />
              {errors.district && <HelperText type="error">{errors.district}</HelperText>}
            </View>
            
            {/* Adresse */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Adresse</Text>
              <TextInput
                mode="outlined"
                value={formData.address}
                onChangeText={(text) => handleChange('address', text)}
                placeholder="Ex: 45 Rue du Commerce"
                outlineColor={errors.address ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.address ? theme.colors.error : theme.colors.primary}
                style={styles.input}
              />
              {errors.address && <HelperText type="error">{errors.address}</HelperText>}
            </View>
          </View>
          
          {/* Section des détails et du prix */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails et prix</Text>
            
            {/* Nombre de chambres */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de chambres</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('bedrooms', Math.max(1, formData.bedrooms - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="#222222" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.bedrooms}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('bedrooms', formData.bedrooms + 1)}
                >
                  <MaterialIcons name="add" size={20} color="#222222" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Nombre de salles de bains */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de salles de bain</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('bathrooms', Math.max(1, formData.bathrooms - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="#222222" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.bathrooms}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('bathrooms', formData.bathrooms + 1)}
                >
                  <MaterialIcons name="add" size={20} color="#222222" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Superficie */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Superficie (m²)</Text>
              <TextInput
                mode="outlined"
                value={formData.size ? formData.size.toString() : ''}
                onChangeText={(text) => handleChange('size', parseInt(text) || 0)}
                placeholder="Ex: 85"
                keyboardType="numeric"
                outlineColor={errors.size ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.size ? theme.colors.error : theme.colors.primary}
                style={styles.input}
                right={<TextInput.Affix text="m²" />}
              />
              {errors.size && <HelperText type="error">{errors.size}</HelperText>}
            </View>
            
            {/* Prix */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Prix par mois</Text>
              <TextInput
                mode="outlined"
                value={formData.price ? formData.price.toString() : ''}
                onChangeText={(text) => handleChange('price', parseInt(text) || 0)}
                placeholder="Ex: 75000"
                keyboardType="numeric"
                outlineColor={errors.price ? theme.colors.error : '#CCCCCC'}
                activeOutlineColor={errors.price ? theme.colors.error : theme.colors.primary}
                style={styles.input}
                right={<TextInput.Affix text="RWF" />}
              />
              {errors.price && <HelperText type="error">{errors.price}</HelperText>}
            </View>
            
            {/* Nombre maximal d'invités */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre maximal d'invités</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('maxGuests', Math.max(1, formData.maxGuests - 1))}
                >
                  <MaterialIcons name="remove" size={20} color="#222222" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.maxGuests}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleChange('maxGuests', formData.maxGuests + 1)}
                >
                  <MaterialIcons name="add" size={20} color="#222222" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Section des commodités */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commodités</Text>
            <Text style={styles.sectionDescription}>
              Sélectionnez les commodités disponibles dans votre logement
            </Text>
            
            <View style={styles.amenitiesContainer}>
              {AMENITIES.map((amenity) => (
                <TouchableOpacity
                  key={amenity.value}
                  style={[
                    styles.amenityItem,
                    formData.amenities.includes(amenity.value) && styles.amenityItemSelected
                  ]}
                  onPress={() => handleToggleAmenity(amenity.value)}
                >
                  <Text style={[
                    styles.amenityText,
                    formData.amenities.includes(amenity.value) && styles.amenityTextSelected
                  ]}>
                    {amenity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Section des règles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Règles du logement</Text>
            
            {/* Fumeurs acceptés */}
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={formData.smokingAllowed ? 'checked' : 'unchecked'}
                onPress={() => handleChange('smokingAllowed', !formData.smokingAllowed)}
                color="#FF5A5F"
              />
              <Text style={styles.checkboxLabel}>Fumeurs acceptés</Text>
            </View>
            
            {/* Animaux acceptés */}
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={formData.petsAllowed ? 'checked' : 'unchecked'}
                onPress={() => handleChange('petsAllowed', !formData.petsAllowed)}
                color="#FF5A5F"
              />
              <Text style={styles.checkboxLabel}>Animaux acceptés</Text>
            </View>
          </View>
          
          {/* Section des photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.sectionDescription}>
              Ajoutez des photos de votre logement (min. 1 photo)
            </Text>
            
            {errors.images && <HelperText type="error">{errors.images}</HelperText>}
            
            <View style={styles.imagesContainer}>
              {/* Afficher les images téléchargées */}
              {formData.images.map((image, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <MaterialIcons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Bouton pour ajouter une image (mise à jour pour utiliser la galerie) */}
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={openGallery}
              >
                <MaterialIcons name="photo-library" size={24} color="#555555" />
                <Text style={styles.addImageText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Bouton de soumission en bas de l'écran */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          style={styles.publishButton}
          labelStyle={styles.publishButtonLabel}
          onPress={handleSubmit}
        >
          Publier l'annonce
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  publishButton: {
    backgroundColor: '#FF5A5F',
    paddingVertical: 8,
    borderRadius: 8,
  },
  publishButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222222',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#222222',
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    margin: 4,
  },
  amenityItemSelected: {
    backgroundColor: '#FF5A5F',
  },
  amenityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
  },
  amenityTextSelected: {
    color: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#222222',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imagePreviewContainer: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 4,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#FF5A5F',
  },
  addImageButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    color: '#222222',
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: '#222222',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationButtonText: {
    marginLeft: 8,
    color: '#333333',
    fontWeight: '500',
  },
});

export default CreateListingScreen; 