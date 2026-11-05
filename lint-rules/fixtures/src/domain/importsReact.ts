import { Platform } from 'react-native';

export const isIos = (): boolean => Platform.OS === 'ios';
