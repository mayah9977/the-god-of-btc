'use client';

import { useState } from 'react';
import { requestPermissionAndRegister } from '@/lib/push';

export default function TestPushPage() {
  const [title, setTitle] = useState('Test Push Notification');
  const [body, setBody] = useState('푸시가 정상 동작합니다 ✅');
  const [icon, setIcon] = useState('/favicon.ico');
  const [url, setUrl] = useState('/');

  // 1) 권한 + FCM 등록 (이미 등록되어 있으면 true)
  const enablePush = async () => {
    const ok = await requestPermissionAndRegister();
    alert(ok ? '알림 권한 및 FCM 등록 완료 ✅' : '등록 실패 ❌ (브라우저 권한/콘솔 확인)');
  };

  // 2) 로컬에서 알림 직접 표시 (NotificationOptions의 actions 타입 에러 방지: as any)
  const showLocalNotification = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const options = {
        body,
        icon,
        badge: icon,
        data: { url },
        actions: [
          { action: 'open', title: '열기' },
          { action: 'close', title: '닫기' },
        ],
        requireInteraction: false,
        vibrate: [50, 50, 50],
      } as any;

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        console.log('✅ reg.showNotification 호출 완료');
        return;
      }

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, options);
          console.log('✅ new Notification 호출 완료');
        } else {
          alert('먼저 "알림 허용"을 눌러 권한을 승인해주세요.');
        }
      } else {
        alert('이 브라우저는 Notification API를 지원하지 않습니다.');
      }
    } catch (e: any) {
      console.error(e);
      alert(`알림 표시 중 오류: ${e?.message || e}`);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">🔔 Push Test</h1>

      <div className="grid gap-2">
        <label className="grid gap-1 text-sm">
          <span className="text-gray-600">제목</span>
          <input
            className="rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-gray-600">메시지</span>
          <input
            className="rounded border px-3 py-2"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-gray-600">아이콘 URL</span>
          <input
            className="rounded border px-3 py-2"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="/favicon.ico"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-gray-600">알림 클릭 시 열 URL</span>
          <input
            className="rounded border px-3 py-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={enablePush}
          className="rounded bg-black px-4 py-2 text-white"
        >
          1) 알림 허용 + FCM 등록
        </button>
        <button
          onClick={showLocalNotification}
          className="rounded border px-4 py-2"
        >
          2) 테스트 알림 표시
        </button>
      </div>

      <p className="text-sm text-gray-500">
        팁: Chrome DevTools → <b>Application &gt; Service Workers</b>에서 로그를 보거나,
        Windows라면 <b>Win + A</b>로 알림센터 기록 확인 가능.
      </p>
    </main>
  );
}


