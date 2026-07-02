import { google } from "googleapis";
import type { GscPageRow, GscQueryRow, GscSummary } from "../types.js";

function getAuth() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "http://localhost:8080"
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
}

// Retry on ECONNRESET / transient network errors with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const isRetryable = code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND";
      if (!isRetryable || attempt === retries) throw err;
      console.warn(`GSC request failed (${code}), retrying ${attempt}/${retries - 1} in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw new Error("unreachable");
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// GSC has ~2 day data lag, so offset all windows by 3 days
// Current week:  10 days ago → 3 days ago
// Previous week: 17 days ago → 10 days ago
const CURRENT_START = dateStr(10);
const CURRENT_END = dateStr(3);
const PREV_START = dateStr(17);
const PREV_END = dateStr(10);

async function queryPages(siteUrl: string, startDate: string, endDate: string): Promise<GscPageRow[]> {
  const auth = getAuth();
  const sc = google.searchconsole({ version: "v1", auth });

  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 25,
      dataState: "final",
    },
  });

  return (res.data.rows ?? []).map((r) => ({
    page: (r.keys?.[0] ?? "").replace(siteUrl.replace(/\/$/, ""), ""),
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: Math.round((r.ctr ?? 0) * 1000) / 10,
    position: Math.round((r.position ?? 0) * 10) / 10,
  }));
}

async function queryQueries(siteUrl: string, startDate: string, endDate: string): Promise<GscQueryRow[]> {
  const auth = getAuth();
  const sc = google.searchconsole({ version: "v1", auth });

  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 25,
      dataState: "final",
    },
  });

  return (res.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: Math.round((r.ctr ?? 0) * 1000) / 10,
    position: Math.round((r.position ?? 0) * 10) / 10,
  }));
}

async function querySummary(siteUrl: string, startDate: string, endDate: string) {
  const auth = getAuth();
  const sc = google.searchconsole({ version: "v1", auth });

  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [],
      rowLimit: 1,
      dataState: "final",
    },
  });

  const row = res.data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: Math.round((row?.ctr ?? 0) * 1000) / 10,
    position: Math.round((row?.position ?? 0) * 10) / 10,
  };
}

export async function fetchGscData(siteUrl: string): Promise<GscSummary> {
  const [currentSummary, currentPages, currentQueries, prevPages] = await Promise.all([
    withRetry(() => querySummary(siteUrl, CURRENT_START, CURRENT_END)),
    withRetry(() => queryPages(siteUrl, CURRENT_START, CURRENT_END)),
    withRetry(() => queryQueries(siteUrl, CURRENT_START, CURRENT_END)),
    withRetry(() => queryPages(siteUrl, PREV_START, PREV_END)),
  ]);

  const prevPageMap = new Map(prevPages.map((p) => [p.page, p.clicks]));

  const decliningPages = currentPages
    .filter((p) => {
      const prev = prevPageMap.get(p.page) ?? 0;
      return prev > 5 && p.clicks < prev * 0.8;
    })
    .map((p) => ({
      ...p,
      prevClicks: prevPageMap.get(p.page) ?? 0,
      changePct: Math.round(((p.clicks - (prevPageMap.get(p.page) ?? 0)) / (prevPageMap.get(p.page) ?? 1)) * 100),
    }))
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 5);

  const lowCtrPages = currentPages
    .filter((p) => p.impressions >= 50 && p.ctr < 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  const nearRankPages = currentPages
    .filter((p) => p.position >= 4 && p.position <= 15 && p.impressions >= 30)
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);

  return {
    period: `${CURRENT_START} → ${CURRENT_END}`,
    totalClicks: currentSummary.clicks,
    totalImpressions: currentSummary.impressions,
    avgCtr: currentSummary.ctr,
    avgPosition: currentSummary.position,
    topPages: currentPages.slice(0, 10),
    topQueries: currentQueries.slice(0, 10),
    decliningPages,
    lowCtrPages,
    nearRankPages,
  };
}
