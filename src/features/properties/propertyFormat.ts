import type { PropertyTrack } from '@/domain/propertyQuotes';

export const TRACK_NAMES: Readonly<Record<PropertyTrack, string>> = {
  renovation: 'Renovation',
  furnishings: 'Furnishings',
  systems: 'Building Systems',
  expansion: 'Expansion',
};

export const TRACK_EFFECTS: Readonly<Record<PropertyTrack, string>> = {
  renovation: 'Higher rent',
  furnishings: 'Higher rent',
  systems: 'Lower upkeep',
  expansion: 'Higher rent and upkeep',
};
