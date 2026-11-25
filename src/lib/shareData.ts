import { Share } from 'react-native';

/** Hands a JSON export to the system share sheet (save to Files, email it to yourself, ...). */
export async function shareJson(fileName: string, data: unknown) {
  await Share.share({ title: fileName, message: JSON.stringify(data, null, 2) });
}
