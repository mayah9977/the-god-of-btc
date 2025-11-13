// ✅ FCM 웹 푸시용 서비스워커 (public/firebase-messaging-sw.js)
// - FCM이 보낸 푸시 payload를 받아 브라우저 알림으로 표시합니다.
// - 이 파일은 반드시 public/ 최상위에 있어야 합니다.

self.addEventListener('push', (event) => {
  try {
    const payload = event.data?.json?.() ?? event.data ? event.data.json() : {};
    const n = payload.notification || {};
    const data = payload.data || {};

    const title = n.title || '알림';
    const body = n.body || '';
    const icon = n.icon || '/icon-192x192.png'; // 아이콘 파일이 없으면 기본값

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        data, // 클릭 시 열 URL 등을 data.click_action으로 받을 수 있음
        requireInteraction: false,
      })
    );
  } catch (e) {
    // 혹시 payload가 json이 아닐 때 대비
    event.waitUntil(
      self.registration.showNotification('알림', {
        body: '새 알림이 도착했습니다.',
      })
    );
  }
});

// 알림 클릭 시 탭 포커스/열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && (event.notification.data.click_action || event.notification.data.url)) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            return client.focus();
          }
        } catch (_) {}
      }
      return self.clients.openWindow(target);
    })
  );
});






