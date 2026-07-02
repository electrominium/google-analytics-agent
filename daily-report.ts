import "dotenv/config";
import { APPS } from "./src/config.js";
import { fetchGscData } from "./src/apis/search-console.js";
import { fetchGa4Data } from "./src/apis/analytics.js";
import { generateRecommendations } from "./src/analysis/analyzer.js";
import { generateHtmlReport } from "./src/report/generator.js";
import { sendReport, sendErrorAlert } from "./src/report/emailer.js";
import { writeRecommendationsFile } from "./src/recommendations/writer.js";
import type { AppReport } from "./src/types.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function processApp(app: (typeof APPS)[0]): Promise<AppReport> {
  console.log(`\n[${app.displayName}] Fetching GSC data...`);
  const gsc = await fetchGscData(app.gscSiteUrl);
  console.log(`[${app.displayName}] Clicks: ${gsc.totalClicks} | Impressions: ${gsc.totalImpressions}`);

  console.log(`[${app.displayName}] Fetching GA4 data...`);
  const ga4 = await fetchGa4Data(app.ga4PropertyId);
  console.log(`[${app.displayName}] Sessions: ${ga4.totalSessions} | Users: ${ga4.totalUsers}`);

  const recommendations = generateRecommendations(app, gsc, ga4);
  console.log(`[${app.displayName}] Generated ${recommendations.length} recommendations`);

  return {
    app,
    gsc,
    ga4,
    recommendations,
    generatedAt: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  };
}

async function main() {
  console.log(`Analytics Agent — ${new Date().toISOString()}`);
  if (DRY_RUN) console.log("DRY RUN — email will not be sent");

  const reports: AppReport[] = [];

  for (const app of APPS) {
    try {
      const report = await processApp(app);
      reports.push(report);

      if (!DRY_RUN) {
        writeRecommendationsFile(report);
      }
    } catch (err) {
      console.error(`[${app.displayName}] Error:`, err);
      if (!DRY_RUN) {
        await sendErrorAlert(app.displayName, err).catch(console.error);
      }
    }
  }

  if (reports.length === 0) {
    console.error("All apps failed. Exiting.");
    process.exit(1);
  }

  const html = generateHtmlReport(reports);
  const totalRecs = reports.reduce((n, r) => n + r.recommendations.length, 0);

  if (DRY_RUN) {
    console.log(`\nDry run complete. Would email report with ${totalRecs} total recommendations.`);
    console.log("Report HTML preview saved to: /tmp/analytics-report-preview.html");
    const { writeFileSync } = await import("fs");
    writeFileSync("/tmp/analytics-report-preview.html", html);
    return;
  }

  await sendReport(html, totalRecs);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
