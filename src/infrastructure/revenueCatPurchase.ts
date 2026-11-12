import type { PURCHASES_ERROR_CODE } from 'react-native-purchases';

export type RevenueCatErrorName = keyof typeof PURCHASES_ERROR_CODE;

export type CheckoutFailure =
  | 'cancelled'
  | 'pending'
  | 'alreadyOwned'
  | 'declined'
  | 'verificationFailed'
  | 'unavailable';

const failureByError: Partial<Record<RevenueCatErrorName, CheckoutFailure>> = {
  PURCHASE_CANCELLED_ERROR: 'cancelled',
  PURCHASE_NOT_ALLOWED_ERROR: 'declined',
  PURCHASE_INVALID_ERROR: 'declined',
  PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: 'declined',
  PRODUCT_ALREADY_PURCHASED_ERROR: 'alreadyOwned',
  PAYMENT_PENDING_ERROR: 'pending',
  SIGNATURE_VERIFICATION_ERROR: 'verificationFailed',
};

export function checkoutFailure(error: RevenueCatErrorName | 'unknown'): CheckoutFailure {
  return error === 'unknown' ? 'unavailable' : (failureByError[error] ?? 'unavailable');
}
