import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `locamap-viewed:${userId}`;
let queue = Promise.resolve();
export async function getViewedProperties(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  try { const ids: unknown = JSON.parse(raw || '[]'); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string').slice(0,30) : []; }
  catch {return [];}
}
export function recordViewedProperty(propertyId: string, userId: string): Promise<void> {
  queue = queue.catch(() => {}).then(async () => {
    const ids = await getViewedProperties(userId);
    await AsyncStorage.setItem(key(userId),JSON.stringify([propertyId,...ids.filter(id=>id!==propertyId)].slice(0,30)));
  });
  return queue;
}
export async function clearViewedProperties(userId: string): Promise<void> {
  await queue.catch(() => {});
  await AsyncStorage.removeItem(key(userId));
}
