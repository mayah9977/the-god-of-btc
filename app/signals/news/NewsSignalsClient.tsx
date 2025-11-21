"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

import { subscribeTopic, subscribeSymbol } from "../../../lib/client-fcm";

export default function NewsSignalsClient({ initialItems }: any) {
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).subscribeTopic = subscribeTopic;
      (window as any).subscribeSymbol = subscribeSymbol;
    }
  }, []);

  async function handleSubscribeSignals() {
    try {
      await subscribeTopic("signals");
      alert("📡 실시간 뉴스/시그널 알림 구독 완료!");
      setSubscribed(true);
    } catch (e: any) {
      console.error(e);
      alert("❌ 알림 권한 또는 구독 실패");
    }
  }

  async function handleSubscribeBTC() {
    await subscribeSymbol("BTCUSDT");
    alert("BTC 알림 구독 완료!");
  }

  return (
    <div>
      <div className="flex justify-end my-2">
        <Button onClick={handleSubscribeSignals} disabled={subscribed}>
          <Bell className="w-4 h-4 mr-2" />
          {subscribed ? "구독 중" : "알림 허용"}
        </Button>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={handleSubscribeBTC} variant="outline" size="sm">
          BTC만 구독
        </Button>
      </div>
    </div>
  );
}




