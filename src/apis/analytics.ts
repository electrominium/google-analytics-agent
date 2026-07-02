import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import type { Ga4PageRow, Ga4SourceRow, Ga4Summary } from "../types.js";

function getClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "http://localhost:8080"
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return new BetaAnalyticsDataClient({ authClient: oauth2 as never });
}

export async function fetchGa4Data(propertyId: string): Promise<Ga4Summary> {
  const client = getClient();
  const property = `properties/${propertyId}`;

  const TIMEOUT_MS = 30_000; // 30s — prevent gRPC DEADLINE_EXCEEDED after ~900s

  const [pagesRes, sourcesRes, overviewRes] = await Promise.all([
    client.runReport({
      property,
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "engagementRate" },
        { name: "averageSessionDuration" },
      ],
      dateRanges: [{ startDate: "7daysAgo", endDate: "1daysAgo" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 25,
    }, { timeout: TIMEOUT_MS }),

    client.runReport({
      property,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: "7daysAgo", endDate: "1daysAgo" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }, { timeout: TIMEOUT_MS }),

    client.runReport({
      property,
      dimensions: [],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "engagementRate" },
      ],
      dateRanges: [{ startDate: "7daysAgo", endDate: "1daysAgo" }],
    }, { timeout: TIMEOUT_MS }),
  ]);

  const pages: Ga4PageRow[] = (pagesRes[0].rows ?? []).map((r) => ({
    pagePath: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
    engagementRate: Math.round(Number(r.metricValues?.[2]?.value ?? 0) * 100),
    avgEngagementTime: Math.round(Number(r.metricValues?.[3]?.value ?? 0)),
  }));

  const sources: Ga4SourceRow[] = (sourcesRes[0].rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    medium: r.dimensionValues?.[1]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const overviewRow = overviewRes[0].rows?.[0];
  const totalSessions = Number(overviewRow?.metricValues?.[0]?.value ?? 0);
  const totalUsers = Number(overviewRow?.metricValues?.[1]?.value ?? 0);
  const newUsers = Number(overviewRow?.metricValues?.[2]?.value ?? 0);
  const engagementRate = Math.round(Number(overviewRow?.metricValues?.[3]?.value ?? 0) * 100);

  const highBouncePages = pages
    .filter((p) => p.sessions >= 20 && p.engagementRate < 30)
    .sort((a, b) => a.engagementRate - b.engagementRate)
    .slice(0, 5);

  return {
    period: "Last 7 days",
    totalSessions,
    totalUsers,
    newUsers,
    engagementRate,
    topPages: pages.slice(0, 10),
    topSources: sources,
    highBouncePages,
  };
}
