import { writeFileSync } from "fs";
import { join } from "path";
import type { AppReport } from "../types.js";

export function writeRecommendationsFile(report: AppReport): void {
  const { app, gsc, ga4, recommendations, generatedAt } = report;

  if (recommendations.length === 0) {
    const content = `# ${app.displayName} — Recommendations\n\nGenerated: ${generatedAt}\n\nNo recommendations today. All metrics look healthy.\n`;
    writeFileSync(join(app.repoPath, "RECOMMENDATIONS.md"), content, "utf-8");
    return;
  }

  const lines: string[] = [
    `# ${app.displayName} — Recommendations`,
    ``,
    `Generated: ${generatedAt}`,
    `Period: GSC ${gsc.period} | GA4 ${ga4.period}`,
    ``,
    `---`,
    ``,
    `## How to apply`,
    ``,
    `Open Claude Code in this directory and say:`,
    `> "Apply recommendation #N from RECOMMENDATIONS.md"`,
    ``,
    `Claude will make the code change and show you a diff before committing anything.`,
    ``,
    `---`,
    ``,
    `## Recommendations`,
    ``,
  ];

  for (const rec of recommendations) {
    const priorityBadge = rec.priority.toUpperCase();
    lines.push(`### #${rec.id} [${priorityBadge}] ${rec.title}`);
    lines.push(``);
    lines.push(`**Category:** ${rec.category}`);
    lines.push(``);
    lines.push(`**Why:** ${rec.context}`);
    lines.push(``);
    lines.push(`**What to do:** ${rec.action}`);
    if (rec.filePath) {
      lines.push(``);
      lines.push(`**File:** \`${rec.filePath}\``);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  writeFileSync(join(app.repoPath, "RECOMMENDATIONS.md"), lines.join("\n"), "utf-8");
  console.log(`Wrote ${recommendations.length} recommendations → ${app.repoPath}/RECOMMENDATIONS.md`);
}
