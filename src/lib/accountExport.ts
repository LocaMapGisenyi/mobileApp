import { Platform, Share } from 'react-native';
import type { AccountExport } from '../services/api/user.service';
export async function saveAccountExport(data: AccountExport): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `locamap-donnees-${data.exportedAt.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    await Share.share({ title: 'Mes données LocaMap', message: json });
  }
}
