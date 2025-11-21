// @ts-nocheck
import { adminMessaging } from '@/lib/firebase-admin';

type PushData = Record<string, string | undefined>;

export async function sendTopicPush(
  topic: string,
  title: string,
  body: string,
  data: PushData = {},
) {
  if (!topic) return;

  const message = {
    topic,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? '']),
    ),
  };

  try {
    const id = await adminMessaging.send(message as any);
    console.log('[PUSH][topic]', topic, '→', id);
  } catch (err) {
    console.error('[PUSH][topic] error:', err);
  }
}

export async function sendTokenPush(
  token: string,
  title: string,
  body: string,
  data: PushData = {},
) {
  if (!token) return;

  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? '']),
    ),
  };

  try {
    const id = await adminMessaging.send(message as any);
    console.log('[PUSH][token]', token, '→', id);
  } catch (err) {
    console.error('[PUSH][token] error:', err);
  }
}

/**
 * 사용자 전용 토픽: user-<uid>
 *  - /settings 에서 각 사용자 FCM 토큰을 user-<uid> 토픽에 subscribe 시켜두면,
 *  - 여기서는 uid만 알면 된다.
 */
export async function sendUserTopicPush(
  uid: string,
  title: string,
  body: string,
  data: PushData = {},
) {
  if (!uid) return;
  const topic = `user-${uid}`;
  return sendTopicPush(topic, title, body, { uid, ...data });
}


