import type { AppConfig, GscSummary, Ga4Summary, Recommendation } from "../types.js";

export function generateRecommendations(
  app: AppConfig,
  gsc: GscSummary,
  ga4: Ga4Summary
): Recommendation[] {
  const recs: Omit<Recommendation, "id">[] = [];

  // Low CTR pages — meta title/description improvements
  for (const page of gsc.lowCtrPages) {
    recs.push({
      priority: "high",
      category: "seo",
      title: `Improve meta title/description for ${page.page || "/"}`,
      context: `${page.impressions} impressions but only ${page.ctr}% CTR (avg position ${page.position}). Industry benchmark is ~5-10% for position ${Math.round(page.position)}.`,
      action: `Rewrite the <title> and meta description for ${page.page || "/"} to be more compelling. Use the primary query in the title. Make the description a clear call-to-action under 155 chars.`,
      filePath: pageToFilePath(app, page.page),
    });
  }

  // Near-rank pages — push to top 3
  for (const page of gsc.nearRankPages) {
    recs.push({
      priority: "high",
      category: "seo",
      title: `Push "${page.page || "/"}" from position ${page.position} into top 3`,
      context: `Ranking at position ${page.position} with ${page.impressions} impressions. Moving to top 3 could 3-5× clicks.`,
      action: `Add more content depth, improve internal links pointing to this page, and add FAQ schema markup. Consider adding an H2 with the exact search query.`,
      filePath: pageToFilePath(app, page.page),
    });
  }

  // Declining pages
  for (const page of gsc.decliningPages) {
    recs.push({
      priority: "high",
      category: "content",
      title: `Investigate traffic drop on ${page.page || "/"}`,
      context: `Clicks dropped from ${page.prevClicks} → ${page.clicks} (${page.changePct}% change) week over week.`,
      action: `Check if the page content is still accurate and up-to-date. Verify the page is indexed (fetch in GSC). Look for any recent content changes. Consider refreshing the content and updating the published date.`,
      filePath: pageToFilePath(app, page.page),
    });
  }

  // High bounce / low engagement pages
  for (const page of ga4.highBouncePages) {
    recs.push({
      priority: "medium",
      category: "ux",
      title: `Improve engagement on ${page.pagePath}`,
      context: `Only ${page.engagementRate}% engagement rate with ${page.sessions} sessions. Users are leaving quickly.`,
      action: `Add a clear above-the-fold value proposition. Ensure the page loads fast. Add a tool or interactive element to keep users engaged. Check if mobile layout is working correctly.`,
      filePath: pageToFilePath(app, page.pagePath),
    });
  }

  // Low organic traffic — check for new pages
  const organicSessions = ga4.topSources
    .filter((s) => s.medium === "organic")
    .reduce((sum, s) => sum + s.sessions, 0);

  if (organicSessions < ga4.totalSessions * 0.3 && ga4.totalSessions > 100) {
    recs.push({
      priority: "medium",
      category: "seo",
      title: "Organic traffic is low relative to total traffic",
      context: `Only ${Math.round((organicSessions / ga4.totalSessions) * 100)}% of sessions come from organic search. Target is 50%+.`,
      action: `Review the sitemap.ts to ensure all pages are included. Submit the sitemap to GSC. Add more internal links from the homepage to key tool pages.`,
    });
  }

  // Good CTR queries that can be used to improve content
  const topQuery = gsc.topQueries[0];
  if (topQuery && topQuery.position > 3) {
    recs.push({
      priority: "low",
      category: "seo",
      title: `Top query "${topQuery.query}" ranks at position ${topQuery.position}`,
      context: `"${topQuery.query}" gets ${topQuery.impressions} impressions and ${topQuery.clicks} clicks at position ${topQuery.position}.`,
      action: `Ensure the exact phrase "${topQuery.query}" appears in the H1 or a prominent H2. Add it to the page title if not already there. Consider creating supporting blog content around this query.`,
    });
  }

  return recs.map((r, i) => ({ ...r, id: i + 1 }));
}

function pageToFilePath(app: AppConfig, page: string): string | undefined {
  if (!page || page === "/") {
    return `${app.repoPath}/src/app/page.tsx`;
  }
  const clean = page.replace(/^\//, "").replace(/\/$/, "");
  return `${app.repoPath}/src/app/${clean}/page.tsx`;
}
