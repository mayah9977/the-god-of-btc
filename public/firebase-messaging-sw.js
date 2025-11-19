// public/firebase-messaging-sw.js
// ✅ FCM 웹 푸시용 서비스워커 (고급 옵션 버전)
// - FCM이 보낸 payload(notification + data)를 받아 브라우저 알림으로 표시
// - image, requireInteraction, actions(버튼), clickUrl, tag, renotify 지원

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    // event.data.json() 이 표준 FCM JSON 포맷
    payload = event.data?.json() ?? {};
  } catch (e) {
    console.error('[SW] push payload parse error:', e);
    payload = {};
  }

  const n = payload.notification || {};
  const d = payload.data || {};

  // 🔹 제목/본문
  const title = n.title || d.title || '알림';
  const body = n.body || d.body || '';

  // 🔹 아이콘/이미지/배지
  const icon = n.icon || d.icon || '/icon-192x192.png';
  const image = n.image || d.image || undefined;       // 큰 이미지
  const badge = d.badge || '/badge-72x72.png';         // 선택 (없어도 동작)

  // 🔹 requireInteraction / tag / renotify
  const requireInteraction = String(d.requireInteraction).toLowerCase() === 'true';
  const tag = d.tag || 'btc-signal';
  const renotify = String(d.renotify).toLowerCase() === 'true';

  // 🔹 클릭 시 열 URL (서버에서 data.clickUrl로 보낸 값)
  const clickUrl =
    d.clickUrl ||
    d.click_action ||
    d.url ||
    '/';

  // 🔹 버튼 텍스트
  const actionOpenTitle = d.actionOpenTitle || '열기';
  const actionCloseTitle = d.actionCloseTitle || '닫기';

  const options = {
    body,
    icon,
    image,
    badge,
    tag,
    renotify,
    requireInteraction,
    data: {
      clickUrl,
      // 필요하면 여기 d 전체를 같이 넣어두면 디버깅에 도움 됨
      raw: d,
    },
    actions: [
      {
        action: 'open',
        title: actionOpenTitle,
      },
      {
        action: 'close',
        title: actionCloseTitle,
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 시 탭 포커스/열기 + 버튼 동작 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.clickUrl || '/';

  // "닫기" 버튼이면 아무것도 안 함
  if (action === 'close') {
    return;
  }

  // 기본 동작 또는 "open" 버튼 → 탭 포커스 또는 새 창
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            // 이미 열려 있는 동일 origin 탭 → 포커스 + (선택) URL 변경
            if (client.url !== targetUrl) {
              // 지원하는 브라우저에서는 navigate 사용
              if ('navigate' in client) {
                client.navigate(targetUrl);
              } else {
                client.postMessage({ type: 'FROM_SW_OPEN_URL', url: targetUrl });
              }
            }
            return client.focus();
          }
        } catch (e) {
          // ignore URL parse error
        }
      }
      // 열린 탭이 없으면 새 창/탭 열기
      return self.clients.openWindow(targetUrl);
    })
  );
});







