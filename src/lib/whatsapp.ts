import { Linking } from 'react-native';

/** 050-123-4567 -> 972501234567 (wa.me wants international format, digits only). */
export function toInternationalIL(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  return `972${digits.replace(/^0/, '')}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${toInternationalIL(phone)}?text=${encodeURIComponent(message)}`;
}

/** No in-app chat in the MVP: contact always goes through a WhatsApp deep link. */
export async function openWhatsApp(phone: string, message: string) {
  await Linking.openURL(buildWhatsAppUrl(phone, message));
}
