// @ts-nocheck
import { adminDB } from '@/lib/firebase-admin';
import { sendUserTopicPush } from '@/lib/server-push';

export type RuleType = 'price_above' | 'funding_below' | 'strategy_entry';

export type NotificationRule = {
  id: string;
  uid: string;
  enabled: boolean;
  type: RuleType;
  symbol: string;
  conditionValue: number;
  strategyId?: string;
  note?: string;
};

async function fetchRulesBySymbol(symbol: string): Promise<NotificationRule[]> {
  const snap = await adminDB
    .collection('user_notification_rules')
    .where('symbol', '==', symbol)
    .where('enabled', '==', true)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;
    return {
      id: doc.id,
      uid: d.uid,
      enabled: d.enabled ?? true,
      type: d.type as RuleType,
      symbol: d.symbol,
      conditionValue: Number(d.conditionValue ?? 0),
      strategyId: d.strategyId ?? undefined,
      note: d.note ?? '',
    };
  });
}

/**
 * TV 시그널이 들어왔을 때, type = "strategy_entry" 규칙을 검사
 */
export async function checkUserRulesForTvSignal(signal: {
  id: string;
  symbol: string;
  side?: string;
  strategyId?: string;
  [key: string]: any;
}) {
  const symbol = (signal.symbol ?? 'BTCUSDT').toUpperCase();
  const rules = await fetchRulesBySymbol(symbol);

  const matched = rules.filter(
    (r) =>
      r.type === 'strategy_entry' &&
      !!r.strategyId &&
      r.strategyId === (signal.strategyId ?? signal.label),
  );

  if (!matched.length) return;

  for (const rule of matched) {
    const title = `[Strategy] ${symbol} entry detected`;
    const body =
      rule.note ||
      `${symbol} strategy ${rule.strategyId} entry signal: ${signal.side ?? ''}`;

    await sendUserTopicPush(rule.uid, title, body, {
      symbol,
      ruleId: rule.id,
      strategyId: rule.strategyId ?? '',
      signalId: signal.id,
    });
  }
}

/**
 * (향후용) 가격/펀딩 조건 검사
 *  - 가격/펀딩 스냅샷을 어떤 cron에서 가져온 뒤,
 *    이 함수를 호출해주면 된다.
 */
export async function checkUserRulesForMarketSnapshot(snapshot: {
  symbol: string;
  price?: number;
  funding?: number;
}) {
  const symbol = (snapshot.symbol ?? 'BTCUSDT').toUpperCase();
  const price = Number(snapshot.price ?? NaN);
  const funding = Number(snapshot.funding ?? NaN);

  const rules = await fetchRulesBySymbol(symbol);

  const tasks: Promise<any>[] = [];

  for (const rule of rules) {
    if (rule.type === 'price_above' && !isNaN(price)) {
      if (price > rule.conditionValue) {
        const title = `[Price] ${symbol} > ${rule.conditionValue}`;
        const body = `BTC price crossed above ${rule.conditionValue} (current: ${price}).`;
        tasks.push(
          sendUserTopicPush(rule.uid, title, body, {
            symbol,
            ruleId: rule.id,
          }),
        );
      }
    }

    if (rule.type === 'funding_below' && !isNaN(funding)) {
      if (funding < rule.conditionValue) {
        const title = `[Funding] ${symbol} funding < ${rule.conditionValue}`;
        const body = `Funding rate dropped below ${rule.conditionValue} (current: ${funding}).`;
        tasks.push(
          sendUserTopicPush(rule.uid, title, body, {
            symbol,
            ruleId: rule.id,
          }),
        );
      }
    }
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }
}
