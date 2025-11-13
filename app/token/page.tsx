// app/token/page.tsx (핵심만 최소 코드)
'use client';
import { useEffect, useState } from 'react';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCK9AfCQX74QK0leBYJj2xgGqOF63gJcRQ",
  authDomain: "the-god-of-btc.firebaseapp.com",
  projectId: "the-god-of-btc",
  storageBucket: "the-god-of-btc.appspot.com",
  messagingSenderId: "971668089355",
  appId: "1:971668089355:web:fe80079ddd6c93e8069b50e",
  measurementId: "G-3YHPFZYBG",
};

// 콘솔 > 프로젝트 설정 > Cloud Messaging > Web Push certificates > Public key
const VAPID_KEY = "BJUgVSJVhln76inUybEQP3IF42EzoliLR_FtO7qwhuwExbkW4bcsmHqhOXT8beDxhvKT-MxH0HnD31jO0vL6dq4";

export default function Page() {
  const [msg, setMsg] = useState("토큰을 요청 중입니다…(알림 권한을 허용하세요)");
  const [token, setToken] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 혹시 다른 곳에서 초기화한 앱이 있으면 지움(값 섞임 방지)
        for (const app of getApps()) await deleteApp(app);

        const supported = await isSupported();
        if (!supported) { setMsg("이 브라우저에서는 FCM 웹푸시가 지원되지 않습니다."); return; }

        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        const t = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!t) { setMsg("토큰을 받지 못했습니다. 알림 권한을 허용했는지 확인하세요."); return; }
        setToken(t);
        setMsg(`토큰 길이: ${t.length}`);
        console.log("TOKEN =>", t);
      } catch (e: any) {
        setMsg(String(e?.message || e));
      }
    })();
  }, []);

  return (
    <div style={{padding:24}}>
      <h1>웹 푸시 토큰 발급</h1>
      <div>서비스워커 파일: <code>/firebase-messaging-sw.js</code> 가 <b>public</b> 폴더에 있어야 합니다.</div>
      <p>{msg}</p>
      {token && <textarea style={{width:'100%',height:160}} readOnly value={token} />}
    </div>
  );
}

