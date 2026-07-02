/**
 * One-time setup: authenticates with Google and saves a refresh token to .env.
 * Run: npm run setup-auth
 */
import "dotenv/config";
import { google } from "googleapis";
import { createServer } from "http";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env");
  process.exit(1);
}

const REDIRECT_URI = "http://localhost:8080";
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // forces refresh_token to be returned
});

console.log("\nOpening browser for Google authorization...");
console.log("If the browser does not open, visit this URL manually:\n");
console.log(authUrl + "\n");

try {
  execSync(`open "${authUrl}"`);
} catch {}

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, "http://localhost:8080");
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No authorization code received.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(500);
      res.end("No refresh token returned. Revoke access at https://myaccount.google.com/permissions and try again.");
      server.close();
      return;
    }

    // Write refresh token into .env
    const envPath = new URL(".env", import.meta.url).pathname;
    let envContent = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";

    if (envContent.includes("GOOGLE_OAUTH_REFRESH_TOKEN=")) {
      envContent = envContent.replace(/GOOGLE_OAUTH_REFRESH_TOKEN=.*/m, `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nGOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }

    writeFileSync(envPath, envContent);
    console.log("\nRefresh token saved to .env");
    console.log("Setup complete. You can now run: npm run report\n");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body style='font-family:sans-serif;padding:40px'><h2>Authorization complete!</h2><p>Refresh token saved. You can close this window.</p></body></html>");
    server.close();
    process.exit(0);
  } catch (err) {
    console.error("Error exchanging code for tokens:", err);
    res.writeHead(500);
    res.end("Error getting tokens — check terminal.");
    server.close();
    process.exit(1);
  }
});

server.listen(8080, () => {
  console.log("Waiting for authorization on http://localhost:8080 ...");
});
