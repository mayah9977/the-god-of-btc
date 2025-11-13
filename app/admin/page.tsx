"use client";
import React, { useMemo, useState } from "react";

// --- shadcn/ui ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// /app/admin/page.tsx  —  "고급 PUSH" 올인원 (정상 동작 버전)
// - 토픽/토큰 발송, 이미지/아이콘/사운드/우선순위
// - 새창/동일탭 분기, requireInteraction
// - 토픽 구독/해제 원클릭
// - /api/push/send /api/push/subscribe /api/push/unsubscribe 연동
// -----------------------------------------------------------------------------

const DEFAULT_TOPICS = ["btc", "eth", "futures", "news"] as const;

type TargetType = "topic" | "token";

type Priority = "normal" | "high" | "very-high"; // very-high는 Android에서만 의미 있음

export default function AdminPushPage() {
  // 대상/토큰/토픽
  const [targetType, setTargetType] = useState<TargetType>("topic");
  const [topic, setTopic] = useState<string>(String(DEFAULT_TOPICS[0]));
  const [customTopic, setCustomTopic] = useState("");
  const [token, setToken] = useState(""); // 개별 발송용
  const [tokenForSub, setTokenForSub] = useState(""); // 구독/해제용

  // 알림 내용
  const [title, setTitle] = useState("Bit Hacker — 새 신호 알림");
  const [body, setBody] = useState("BTC/USDT 롱 진입 신호 발생");
  const [clickUrl, setClickUrl] = useState("https://the-god-of-btc.app/signal/123");
  const [iconUrl, setIconUrl] = useState("/icons/bithacker-192.png");
  const [imageUrl, setImageUrl] = useState("");
  const [sound, setSound] = useState("default");
  const [priority, setPriority] = useState<Priority>("high");
  const [requireInteraction, setRequireInteraction] = useState(true);
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [ttlSeconds, setTtlSeconds] = useState<number>(3600);

  const resolvedTopic = useMemo(() => {
    return topic === "custom" ? customTopic.trim() : topic;
  }, [topic, customTopic]);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !body.trim()) return false;
    if (targetType === "topic") return !!resolvedTopic;
    if (targetType === "token") return token.trim().length > 20; // 대충 유효성
    return false;
  }, [title, body, targetType, resolvedTopic, token]);

  const preview = useMemo(
    () => ({
      title: title || "(제목 없음)",
      body: body || "(내용 없음)",
      icon: iconUrl || undefined,
      image: imageUrl || undefined,
      link: clickUrl || undefined,
      requireInteraction,
    }),
    [title, body, iconUrl, imageUrl, clickUrl, requireInteraction]
  );

  // -------------------- 액션: 전송 / 구독 / 해제 --------------------
  async function handleSend() {
    if (!canSubmit) {
      alert("필수 값을 확인하세요 (제목/내용 + 대상)");
      return;
    }

    const payload = {
      targetType,
      target: targetType === "topic" ? resolvedTopic : token.trim(),
      notification: {
        title: title.trim(),
        body: body.trim(),
        icon: iconUrl.trim() || undefined,
        image: imageUrl.trim() || undefined,
        sound: sound.trim() || undefined, // 안드로이드 중심
        requireInteraction,
        priority, // normal | high | very-high
      },
      link: clickUrl.trim() || undefined,
      openInNewTab,
      ttl: Number(ttlSeconds) || 3600,
      data: { screen: "/signal/123", source: "admin" },
    } as const;

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "푸시 실패");
      alert(`전송 성공: ${json?.message || "ok"}`);
    } catch (e: any) {
      alert(`전송 실패: ${e?.message || e}`);
    }
  }

  async function handleSubscribeTopic() {
    const t = tokenForSub.trim();
    if (!t) return alert("FCM 토큰을 입력하세요 (우측 콘솔에 출력된 값)");
    if (!resolvedTopic) return alert("Topic을 선택하거나 입력하세요");
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, topic: resolvedTopic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "구독 실패");
      alert(`구독 성공: ${resolvedTopic}`);
    } catch (e: any) {
      alert(`구독 실패: ${e?.message || e}`);
    }
  }

  async function handleUnsubscribeTopic() {
    const t = tokenForSub.trim();
    if (!t) return alert("FCM 토큰을 입력하세요 (우측 콘솔에 출력된 값)");
    if (!resolvedTopic) return alert("Topic을 선택하거나 입력하세요");
    try {
      const res = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, topic: resolvedTopic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "구독 해제 실패");
      alert(`구독 해제 성공: ${resolvedTopic}`);
    } catch (e: any) {
      alert(`구독 해제 실패: ${e?.message || e}`);
    }
  }

  // ------------------------------- UI -------------------------------
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">/admin · 고급 PUSH 콘솔</h1>
        <div className="text-xs text-muted-foreground">topic/image/sound/priority</div>
      </div>

      {/* 토픽 구독(원클릭) */}
      <Card>
        <CardHeader>
          <CardTitle>토픽 구독 (원클릭)</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>FCM Token (이 브라우저 토큰 붙여넣기)</Label>
            <Input
              placeholder="콘솔에 출력된 FCM registration token"
              value={tokenForSub}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenForSub(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">* /admin 우측 Console의 <code>[register] token: ...</code> 값을 복사해 붙여넣으세요.</p>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSubscribeTopic}>선택 토픽 구독</Button>
            <Button variant="secondary" onClick={handleUnsubscribeTopic}>구독 해제</Button>
          </div>
        </CardContent>
      </Card>

      {/* 대상 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>대상 선택</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Target Type</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">Topic (구독자 전체)</SelectItem>
                <SelectItem value="token">Token (개별 사용자)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "topic" ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Topic</Label>
              <div className="grid grid-cols-5 gap-2">
                <Select value={topic} onValueChange={(v) => setTopic(v)}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TOPICS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="custom">custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-3"
                  placeholder="custom topic 입력 (영문/숫자/_/-)"
                  value={customTopic}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTopic(e.target.value)}
                  disabled={topic !== "custom"}
                />
              </div>
              <p className="text-xs text-muted-foreground">* 웹/앱에서 FCM topic을 구독한 사용자에게 일괄 발송됩니다.</p>
            </div>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label>FCM Token</Label>
              <Input
                placeholder="개별 수신자 FCM registration token"
                value={token}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">* 콘솔/브라우저에서 확보한 실제 FCM 토큰을 넣으세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 알림 내용 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 내용</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>메시지</Label>
              <Textarea rows={4} value={body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>클릭 URL</Label>
                <Input value={clickUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClickUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>아이콘 URL</Label>
                <Input placeholder="/icons/bithacker-192.png" value={iconUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIconUrl(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>이미지 URL (옵션)</Label>
                <Input placeholder="https://.../image.png" value={imageUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>사운드 (옵션)</Label>
                <Input placeholder="default 또는 custom.wav" value={sound} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSound(e.target.value)} />
              </div>
            </div>
          </div>

          {/* 고급 옵션 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">normal</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                    <SelectItem value="very-high">very-high (Android)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TTL (초)</Label>
                <Input
                  type="number"
                  min={60}
                  step={60}
                  value={ttlSeconds}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTtlSeconds(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label className="font-medium">Require Interaction</Label>
                <p className="text-xs text-muted-foreground">사용자가 닫을 때까지 유지 (데스크탑에서 유용)</p>
              </div>
              <Switch checked={requireInteraction} onCheckedChange={setRequireInteraction} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label className="font-medium">링크 새 창으로 열기</Label>
                <p className="text-xs text-muted-foreground">off면 동일 탭에서 열기</p>
              </div>
              <Switch checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
            </div>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">미리보기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  {preview.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.icon} alt="icon" className="h-10 w-10 rounded" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="space-y-1">
                    <div className="font-semibold">{preview.title}</div>
                    <div className="text-sm text-muted-foreground">{preview.body}</div>
                    {preview.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.image} alt="preview" className="mt-2 max-h-40 rounded" />
                    )}
                    {preview.link && (
                      <div className="mt-2 text-xs text-blue-600">{preview.link}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 액션 */}
      <div className="flex gap-3">
        <Button onClick={handleSend} disabled={!canSubmit} className={cn("", !canSubmit && "opacity-50 cursor-not-allowed")}>푸시 전송</Button>
        <Button variant="secondary" onClick={() => {
          setTitle("Bit Hacker — 새 신호 알림");
          setBody("BTC/USDT 롱 진입 신호 발생");
          setClickUrl("https://the-god-of-btc.app/signal/123");
          setIconUrl("/icons/bithacker-192.png");
          setImageUrl("");
          setSound("default");
          setPriority("high");
          setRequireInteraction(true);
          setOpenInNewTab(true);
          setTtlSeconds(3600);
          setTargetType("topic");
          setTopic(String(DEFAULT_TOPICS[0]));
          setCustomTopic("");
          setToken("");
          setTokenForSub("");
        }}>초기화</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        * 이 페이지는 <code>/api/push/send</code>, <code>/api/push/subscribe</code>, <code>/api/push/unsubscribe</code> 라우트가 존재한다고 가정합니다.
      </p>
    </div>
  );
}







