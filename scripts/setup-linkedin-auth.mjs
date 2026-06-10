#!/usr/bin/env node
/**
 * One-time LinkedIn OAuth2 setup.
 * Spins up a temporary localhost server, opens the auth URL,
 * exchanges the code for tokens, writes them to .env.
 *
 * Run once, then refresh token lasts 1 year.
 * Re-run after 1 year or if token is revoked.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createInterface } from "node:readline";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CALLBACK_PORT = 8765;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
const SCOPES = "openid profile email w_member_social";
const LINKEDIN_VERSION = "202507";

// ── env helpers ───────────────────────────────────────────────────────────────

function loadEnv() {
  const p = join(root, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

function updateEnvFile(updates) {
  const p = join(root, ".env");
  let content = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (content && !content.endsWith("\n")) content += "\n";

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += line + "\n";
    }
  }

  writeFileSync(p, content, "utf8");
}

// ── prompts ───────────────────────────────────────────────────────────────────

function ask(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim()); });
  });
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for LinkedIn callback (90s). Try again."));
    }, 90_000);

    const server = createServer((req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404); res.end(); return;
      }
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (code) {
        res.end("<h2 style='font-family:system-ui'>✓ Auth complete — you can close this tab.</h2>");
        clearTimeout(timer);
        server.close(() => resolve(code));
      } else {
        res.end(`<h2 style='font-family:system-ui'>Error: ${error || "unknown"}</h2>`);
        clearTimeout(timer);
        server.close(() => reject(new Error(`LinkedIn OAuth error: ${error}`)));
      }
    });

    server.listen(CALLBACK_PORT);
  });
}

async function exchangeCode(code, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: CALLBACK_URL,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

async function fetchPersonUrn(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch user info (${res.status})`);
  const data = await res.json();
  if (!data.sub) throw new Error("No 'sub' in userinfo response — check OpenID Connect scope");
  return `urn:li:person:${data.sub}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   LinkedIn Auth Setup — doxuanloc.space  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  console.log("Prerequisites (if not done yet):");
  console.log("  1. Go to https://www.linkedin.com/developers/");
  console.log("  2. Create app → Products tab:");
  console.log('     • "Share on LinkedIn" (for w_member_social)');
  console.log('     • "Sign In with LinkedIn using OpenID Connect" (for openid/profile)');
  console.log(`  3. Auth tab → add redirect URL: ${CALLBACK_URL}\n`);

  let clientId = process.env.LINKEDIN_CLIENT_ID || "";
  let clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";

  if (!clientId) clientId = await ask("LINKEDIN_CLIENT_ID: ");
  else console.log(`LINKEDIN_CLIENT_ID: ${clientId} (from .env)`);

  if (!clientSecret) clientSecret = await ask("LINKEDIN_CLIENT_SECRET: ");
  else console.log("LINKEDIN_CLIENT_SECRET: [from .env]");

  if (!clientId || !clientSecret) {
    console.error("Client ID and Secret are required. Exiting.");
    process.exit(1);
  }

  // Build auth URL — no Math.random() state needed for single-machine local flow
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;

  console.log("\nOpen this URL in your browser to authorize:");
  console.log(`\n  ${authUrl}\n`);
  console.log(`Waiting for callback on localhost:${CALLBACK_PORT} (90s timeout)...`);

  let code;
  try {
    code = await waitForCallback();
  } catch (err) {
    console.error(`Setup failed: ${err.message}`);
    process.exit(1);
  }

  console.log("\nExchanging code for tokens...");
  let tokens;
  try {
    tokens = await exchangeCode(code, clientId, clientSecret);
  } catch (err) {
    console.error(`Token exchange failed: ${err.message}`);
    process.exit(1);
  }

  if (!tokens.refresh_token) {
    console.error(
      "No refresh_token in response. Ensure 'Share on LinkedIn' product is approved " +
      "and w_member_social scope is granted."
    );
    process.exit(1);
  }

  console.log("Fetching your LinkedIn person URN...");
  let personUrn;
  try {
    personUrn = await fetchPersonUrn(tokens.access_token);
  } catch (err) {
    console.error(`Failed to fetch person URN: ${err.message}`);
    process.exit(1);
  }

  updateEnvFile({
    LINKEDIN_CLIENT_ID: clientId,
    LINKEDIN_CLIENT_SECRET: clientSecret,
    LINKEDIN_REFRESH_TOKEN: tokens.refresh_token,
    LINKEDIN_PERSON_URN: personUrn,
  });

  console.log("\n✓ Setup complete — written to .env");
  console.log(`  LINKEDIN_PERSON_URN = ${personUrn}`);
  console.log("  LINKEDIN_REFRESH_TOKEN = [saved]");
  console.log("\nRefresh token expires in 1 year. Re-run this script after that.");
  console.log("\nYou can now run: npm run publish:today");
}

main().catch(err => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
