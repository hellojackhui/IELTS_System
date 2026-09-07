import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiClient } from '@ielts/core';
import { applyConversationDocs, collectConversationDocs } from './chat';
import { applyRewardsDoc, collectRewardsDoc } from './rewards';
import { applyWordbookDocs, collectWordbookDocs } from './wordbook';

const WATERMARK = 'docsync:last:v1';

/**
 * Sync conversations / rewards / wordbook through the generic /sync/docs API.
 * Push everything changed since the last watermark, pull remote changes, merge
 * (last-write-wins per document), and advance the watermark.
 */
export async function syncDocs(api: ApiClient): Promise<{ pushed: number; pulled: number }> {
  const last = Number((await AsyncStorage.getItem(WATERMARK)) ?? 0);

  const changes = [
    ...(await collectConversationDocs(last)),
    ...(await collectRewardsDoc(last)),
    ...(await collectWordbookDocs(last)),
  ];
  if (changes.length) await api.pushDocs(changes);

  const { serverTime, docs } = await api.pullDocs(last);
  await applyConversationDocs(docs.filter((d) => d.collection === 'conversations'));
  await applyRewardsDoc(docs.find((d) => d.collection === 'rewards'));
  await applyWordbookDocs(docs.filter((d) => d.collection === 'wordbook'));

  await AsyncStorage.setItem(WATERMARK, String(serverTime));
  return { pushed: changes.length, pulled: docs.length };
}

export async function resetDocsWatermark(): Promise<void> {
  await AsyncStorage.removeItem(WATERMARK);
}
