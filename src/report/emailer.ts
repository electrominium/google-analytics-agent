import { Resend } from "resend";
import { RESEND_API_KEY, REPORT_TO_EMAIL } from "../config.js";

export async function sendReport(html: string, totalRecs: number): Promise<void> {
  const resend = new Resend(RESEND_API_KEY);
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const subject = totalRecs > 0
    ? `Daily Report — ${date} (${totalRecs} recommendation${totalRecs !== 1 ? "s" : ""})`
    : `Daily Report — ${date} (all clear)`;

  const { error } = await resend.emails.send({
    from: "Analytics Agent <feedback@electromlabs.com>",
    to: REPORT_TO_EMAIL,
    subject,
    html,
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  console.log(`Report emailed to ${REPORT_TO_EMAIL}`);
}

export async function sendErrorAlert(appName: string, err: unknown): Promise<void> {
  const resend = new Resend(RESEND_API_KEY);
  const message = err instanceof Error ? err.message : String(err);

  await resend.emails.send({
    from: "Analytics Agent <feedback@electromlabs.com>",
    to: REPORT_TO_EMAIL,
    subject: `Analytics Agent Error — ${appName}`,
    html: `<p>The daily analytics agent failed for <strong>${appName}</strong>:</p><pre style="background:#f1f5f9;padding:16px;border-radius:8px">${message}</pre>`,
  });
}
