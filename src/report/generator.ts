import type { AppReport } from "../types.js";

const PRIORITY_COLOR = { high: "#dc2626", medium: "#d97706", low: "#2563eb" };
const PRIORITY_BG = { high: "#fef2f2", medium: "#fffbeb", low: "#eff6ff" };

function pct(n: number, prev: number): string {
  if (prev === 0) return "";
  const diff = Math.round(((n - prev) / prev) * 100);
  const color = diff >= 0 ? "#16a34a" : "#dc2626";
  const sign = diff >= 0 ? "+" : "";
  return ` <span style="color:${color};font-size:12px">${sign}${diff}%</span>`;
}

function table(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th style="text-align:left;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;color:#374151">${h}</th>`).join("");
  const trs = rows.map((cols) =>
    `<tr>${cols.map((c) => `<td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;color:#111827">${c}</td>`).join("")}</tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function appSection(report: AppReport): string {
  const { app, gsc, ga4, recommendations } = report;

  const recRows = recommendations.map((r) => [
    `<strong>#${r.id}</strong>`,
    `<span style="background:${PRIORITY_BG[r.priority]};color:${PRIORITY_COLOR[r.priority]};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">${r.priority}</span>`,
    `<span style="font-size:11px;color:#6b7280">${r.category}</span>`,
    `<strong>${r.title}</strong><br><span style="color:#6b7280;font-size:12px">${r.context}</span>`,
  ]);

  const topPagesRows = gsc.topPages.slice(0, 8).map((p) => [
    p.page || "/",
    p.clicks.toLocaleString(),
    p.impressions.toLocaleString(),
    `${p.ctr}%`,
    `${p.position}`,
  ]);

  const topQueriesRows = gsc.topQueries.slice(0, 8).map((q) => [
    q.query,
    q.clicks.toLocaleString(),
    `${q.ctr}%`,
    `${q.position}`,
  ]);

  const ga4PagesRows = ga4.topPages.slice(0, 8).map((p) => [
    p.pagePath,
    p.sessions.toLocaleString(),
    p.users.toLocaleString(),
    `${p.engagementRate}%`,
  ]);

  return `
  <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:32px">
    <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:20px 24px">
      <h2 style="margin:0;color:#f1f5f9;font-size:20px">${app.displayName}</h2>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">${app.gscSiteUrl}</p>
    </div>
    <div style="padding:24px">

      <h3 style="margin:0 0 16px;color:#111827;font-size:15px;border-bottom:1px solid #f3f4f6;padding-bottom:8px">Search Console — ${gsc.period}</h3>
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
        ${metric("Clicks", gsc.totalClicks.toLocaleString())}
        ${metric("Impressions", gsc.totalImpressions.toLocaleString())}
        ${metric("Avg CTR", `${gsc.avgCtr}%`)}
        ${metric("Avg Position", `${gsc.avgPosition}`)}
      </div>

      <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">Top Pages by Clicks</p>
      ${table(["Page", "Clicks", "Impressions", "CTR", "Position"], topPagesRows)}

      <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">Top Queries</p>
      ${table(["Query", "Clicks", "CTR", "Position"], topQueriesRows)}

      ${gsc.decliningPages.length > 0 ? `
      <p style="font-size:13px;font-weight:600;color:#dc2626;margin:0 0 8px">Declining Pages</p>
      ${table(["Page", "Clicks", "Prev Clicks", "Change"], gsc.decliningPages.map(p => [p.page || "/", p.clicks.toString(), p.prevClicks.toString(), `<span style="color:#dc2626">${p.changePct}%</span>`]))}
      ` : ""}

      <h3 style="margin:24px 0 16px;color:#111827;font-size:15px;border-bottom:1px solid #f3f4f6;padding-bottom:8px">Google Analytics — ${ga4.period}</h3>
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
        ${metric("Sessions", ga4.totalSessions.toLocaleString())}
        ${metric("Users", ga4.totalUsers.toLocaleString())}
        ${metric("New Users", ga4.newUsers.toLocaleString())}
        ${metric("Engagement", `${ga4.engagementRate}%`)}
      </div>

      <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">Top Pages by Sessions</p>
      ${table(["Page", "Sessions", "Users", "Engagement"], ga4PagesRows)}

      ${recommendations.length > 0 ? `
      <h3 style="margin:24px 0 16px;color:#111827;font-size:15px;border-bottom:1px solid #f3f4f6;padding-bottom:8px">Recommendations (${recommendations.length})</h3>
      ${table(["#", "Priority", "Type", "Recommendation"], recRows)}
      <p style="font-size:12px;color:#9ca3af;margin:0">To apply: open Claude Code in the ${app.name} directory and say <em>"apply recommendation #N from RECOMMENDATIONS.md"</em></p>
      ` : `<p style="color:#16a34a;font-size:14px">No recommendations — all metrics look healthy.</p>`}

    </div>
  </div>`;
}

function metric(label: string, value: string): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;min-width:100px">
    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${label}</div>
    <div style="font-size:22px;font-weight:700;color:#111827;margin-top:4px">${value}</div>
  </div>`;
}

export function generateHtmlReport(reports: AppReport[]): string {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const totalRecs = reports.reduce((n, r) => n + r.recommendations.length, 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:720px;margin:0 auto;padding:32px 16px">

    <div style="text-align:center;margin-bottom:32px">
      <h1 style="margin:0 0 4px;color:#0f172a;font-size:24px">Daily Analytics Report</h1>
      <p style="margin:0;color:#64748b;font-size:14px">${date}</p>
      ${totalRecs > 0 ? `<div style="display:inline-block;margin-top:12px;background:#dc2626;color:white;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">${totalRecs} recommendation${totalRecs !== 1 ? "s" : ""} across all apps</div>` : ""}
    </div>

    ${reports.map(appSection).join("")}

    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Generated by analytics-agent · macOS LaunchAgent</p>
  </div>
</body>
</html>`;
}
