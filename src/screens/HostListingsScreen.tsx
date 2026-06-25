import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Avatar,
  Button,
  Snackbar,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Property } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { propertyService } from '../services/api';
import { useUserStore } from '../store/user';

type HostScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ListingItem {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  rating?: number;
  reviews?: number;
  image: string;
  status: 'active' | 'inactive';
}

const ListingCard = ({ item }: { item: ListingItem }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  return (
    <Card style={styles.card} mode="outlined">
      <View style={styles.cardStatusRow}>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: item.status === 'active' ? '#4CAF50' : '#9E9E9E' }
        ]} />
        <Text style={styles.statusText}>
          {item.status === 'active' ? 'Actif' : 'Inactif'}
        </Text>
      </View>
      
      <Card.Title
        title={item.title}
        subtitle={item.location}
        left={(props) => <Avatar.Icon {...props} icon="home" color="#FFFFFF" style={{ backgroundColor: theme.colors.primary }} />}
      />
      
      <Card.Content>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color="#717171" />
            <Text style={styles.detailText}>{item.price} {item.currency} / mois</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="star" size={20} color="#FF5A5F" />
            <Text style={styles.detailText}>{item.rating || 0} ({item.reviews || 0} avis)</Text>
          </View>
        </View>
      </Card.Content>
      
      <Card.Actions style={styles.cardActions}>
        <Button mode="outlined" compact>Modifier</Button>
        <Button mode="contained" compact style={{ backgroundColor: theme.colors.primary }}>
          Gérer
        </Button>
      </Card.Actions>
    </Card>
  );
};

const HostListingsScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HostScreenNavigationProp>();
  const user = useUserStore((state) => state.user);
  
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  
  // Charger les annonces de l'utilisateur
  useEffect(() => {
    const fetchUserListings = async () => {
      try {
        setLoading(true);
        const properties = await propertyService.getByOwnerId(user?.id || '');
        
        // Convertir les propriétés API en format attendu par l'interface
        const formattedListings: ListingItem[] = properties.map(property => ({
          id: property.id,
          title: property.title,
          location: `${property.location?.district || ''}, ${property.location?.city}`,
          price: property.price,
          currency: property.currency,
          rating: property.rating,
          reviews: property.reviews,
          image: property.images[0] || 'https://via.placeholder.com/300x200',
          status: property.available ? 'active' : 'inactive',
        }));
        
        setListings(formattedListings);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des annonces:', err);
        setError('Impossible de charger vos annonces. Veuillez réessayer.');
        setSnackbarVisible(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserListings();
  }, [user]);
  
  // Fonction de navigation vers l'écran de création d'annonce
  const handleCreateListing = () => {
    navigation.navigate('CreateListing');
  };
  
  // Rendu en cas de chargement
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A5F" />
          <Text style={styles.loadingText}>Chargement de vos annonces...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes annonces</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateListing}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nouvelle annonce</Text>
        </TouchableOpacity>
      </View>
      
      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="home" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>Vous n'avez pas encore d'annonces</Text>
          <Text style={styles.emptySubtext}>Créez votre première annonce pour commencer à louer votre logement</Text>
          <Button 
            mode="contained" 
            style={{ backgroundColor: '#FF5A5F', marginTop: 16 }}
            onPress={handleCreateListing}
          >
            Créer une annonce
          </Button>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard item={item} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F5F5F5',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#717171',
  },
  cardDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#717171',
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#717171',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HostListingsScreen; 