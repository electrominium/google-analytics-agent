export interface AppConfig {
  name: string;
  displayName: string;
  gscSiteUrl: string;
  ga4PropertyId: string;
  repoPath: string;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSummary {
  period: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topPages: GscPageRow[];
  topQueries: GscQueryRow[];
  decliningPages: Array<GscPageRow & { prevClicks: number; changePct: number }>;
  lowCtrPages: GscPageRow[];
  nearRankPages: GscPageRow[];
}

export interface Ga4PageRow {
  pagePath: string;
  sessions: number;
  users: number;
  engagementRate: number;
  avgEngagementTime: number;
}

export interface Ga4SourceRow {
  source: string;
  medium: string;
  sessions: number;
}

export interface Ga4Summary {
  period: string;
  totalSessions: number;
  totalUsers: number;
  newUsers: number;
  engagementRate: number;
  topPages: Ga4PageRow[];
  topSources: Ga4SourceRow[];
  highBouncePages: Ga4PageRow[];
}

export interface Recommendation {
  id: number;
  priority: "high" | "medium" | "low";
  category: "seo" | "content" | "performance" | "ux";
  title: string;
  context: string;
  action: string;
  filePath?: string;
}

export interface AppReport {
  app: AppConfig;
  gsc: GscSummary;
  ga4: Ga4Summary;
  recommendations: Recommendation[];
  generatedAt: string;
}
