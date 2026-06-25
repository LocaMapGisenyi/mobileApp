import React from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Text, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface SearchBarProps {
  onPress?: () => void;
  onFilterPress?: () => void;
  isFloating?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onPress, onFilterPress, isFloating = false }) => {
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        isFloating && styles.floatingContainer
      ]}
    >
      <TouchableOpacity
        style={styles.searchBar}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Rechercher un logement"
        accessibilityHint="Ouvre la recherche avec filtres"
      >
        <View style={styles.searchIconContainer}>
          <Ionicons name="search" size={20} color={colors.gray[600]} />
        </View>
        
        <View style={styles.searchTextContainer}>
          <Text style={styles.searchTextPrimary}>
            Où souhaitez-vous séjourner ?
          </Text>
          <Text style={styles.searchTextSecondary}>
            Gisenyi · Toute date · Ajouter des filtres
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Filtres"
          accessibilityHint="Ouvre les options de filtrage"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="options-outline" size={20} color={colors.gray[800]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    backgroundColor: colors.white,
    zIndex: 10,
  },
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Platform.OS === 'ios' ? 45 : 20,
    backgroundColor: 'transparent',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 50,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    ...shadows.md,
  },
  searchIconContainer: {
    padding: spacing[1],
    marginRight: spacing[2],
  },
  searchTextContainer: {
    flex: 1,
  },
  searchTextPrimary: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[800],
  },
  searchTextSecondary: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
});

export default SearchBar; 