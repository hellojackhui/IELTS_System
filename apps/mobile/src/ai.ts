import type { ChatMessage } from '@ielts/core';
import { fetch as expoFetch } from 'expo/fetch';
import { API_URL, getToken } from './api';

export type { ChatMessage };

/**
 * Stream a reply from the server's /ai/chat endpoint, calling `onToken` for each
 * chunk. The server holds the model API key and proxies to the relay; this only
 * talks to our own server. Uses expo/fetch for streaming response bodies on native.
 */
export async function streamAssistantReply(
  messages: ChatMessage[],
  onToken: (t: string) => void,
): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('请先在「我的」登录后使用 AI 助手');

  const resp = await expoFetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    let msg = `请求失败（${resp.status}）`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      // keep default
    }
    throw new Error(msg);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      let obj: { t?: string; error?: string };
      try {
        obj = JSON.parse(payload);
      } catch {
        continue;
      }
      if (obj.error) throw new Error(obj.error);
      if (obj.t) onToken(obj.t);
    }
  }
}
