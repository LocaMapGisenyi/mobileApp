import React from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Text, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, typography, borderRadius, spacing } from '../theme';

interface MapScreenHeaderProps {
  onBackPress: () => void;
  onFilterPress: () => void;
  listingsCount?: number;
}

const MapScreenHeader: React.FC<MapScreenHeaderProps> = ({ 
  onBackPress, 
  onFilterPress,
  listingsCount
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 15) }
    ]}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBackPress}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray[800]} />
        </TouchableOpacity>
        
        {listingsCount !== undefined && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {listingsCount} logement{listingsCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <Ionicons name="options-outline" size={18} color={colors.gray[800]} />
          <Text style={styles.filterText}>Filtres</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  filterText: {
    marginLeft: 4,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.gray[800],
  },
});

export default MapScreenHeader; 