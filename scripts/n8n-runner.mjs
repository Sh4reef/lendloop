import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

// Load environment variables from .env.local if present
const envFile = "/root/lendloop/.env.local";
const env = { ...process.env };
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        env[k] = v;
      }
    }
  }
}

const PORT = 5678;
const SECRET = env.LENDLOOP_WEBHOOK_SECRET || "lendloop_secret_test_key_1234567890";
const CRON_SECRET = env.CONVEX_INTERNAL_CRON_SECRET || "lendloop_cron_secret_token_12345";
const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_SITE_URL || (env.NEXT_PUBLIC_CONVEX_URL ? env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site") : "https://cheery-mole-696.convex.site");

const activityLogs = [];

function addLog(msg, type = "info") {
  const item = { time: new Date().toISOString(), type, msg };
  activityLogs.unshift(item);
  if (activityLogs.length > 50) activityLogs.pop();
  console.log(`[n8n-runner] [${type.toUpperCase()}] ${msg}`);
}

async function runOverdueWorkflow() {
  addLog("Triggering Overdue Reminders Workflow (Daily 09:00 UTC schedule)");
  try {
    const res = await fetch(`${CONVEX_URL}/api/overdue-loans`, {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Convex returned HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const overdue = data.overdueLoans || [];
    addLog(`Fetched ${overdue.length} overdue loan(s) from Convex.`);

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    for (const loan of overdue) {
      const idempotencyKey = `reminder-${loan.loanId}-${today}`;
      addLog(`Sending reminder to ${loan.borrowerEmail} for item "${loan.toolName}" (Due: ${loan.endDate})`);

      const writeRes = await fetch(`${CONVEX_URL}/api/record-reminder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loanId: loan.loanId,
          idempotencyKey,
          channel: "email",
        }),
      });

      const writeJson = await writeRes.json();
      results.push({ loanId: loan.loanId, writeJson });
      addLog(`Recorded reminder in Convex: ${JSON.stringify(writeJson)}`);
    }

    return { success: true, count: overdue.length, results };
  } catch (err) {
    addLog(`Error in Overdue Workflow: ${err.message}`, "error");
    return { success: false, error: err.message };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Webhook endpoint: /webhook/request-notification
  if (url.pathname === "/webhook/request-notification" && req.method === "POST") {
    let bodyChunks = [];
    req.on("data", (chunk) => bodyChunks.push(chunk));
    req.on("end", async () => {
      const rawBody = Buffer.concat(bodyChunks).toString();
      const signature = req.headers["x-lendloop-signature"];
      const eventType = req.headers["x-lendloop-event"] || "unknown";

      if (!signature) {
        addLog("Rejected webhook: missing x-lendloop-signature header", "error");
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing HMAC signature" }));
        return;
      }

      // Timing-safe HMAC-SHA256 verification
      const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature, "utf8");
      const expBuf = Buffer.from(expected, "utf8");

      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        addLog(`HMAC verification failed for event ${eventType}`, "error");
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid HMAC signature" }));
        return;
      }

      let payload = {};
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        payload = { raw: rawBody };
      }

      addLog(`✓ HMAC verified. Event: ${eventType}. Payload: ${JSON.stringify(payload)}`, "success");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, verified: true, event: eventType }));
    });
    return;
  }

  // 2. Trigger Overdue Workflow manually
  if (url.pathname === "/trigger/daily-overdue" && req.method === "POST") {
    const outcome = await runOverdueWorkflow();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(outcome));
    return;
  }

  // 3. UI Dashboard / Activity Log
  if (url.pathname === "/" || url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LendLoop n8n Automation Engine</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-900 text-gray-100 p-8">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
            <div>
              <h1 class="text-2xl font-bold text-emerald-400">⚡ LendLoop n8n Automation Engine</h1>
              <p class="text-xs text-gray-400 mt-1">Convex Target: <code class="text-blue-400">${CONVEX_URL}</code></p>
            </div>
            <button onclick="triggerOverdue()" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded shadow">
              Run Daily Overdue Workflow
            </button>
          </div>

          <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📋 Live Execution & Webhook Audit Logs</span>
              <button onclick="location.reload()" class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Refresh</button>
            </h2>
            <div class="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
              ${activityLogs.length === 0 ? '<p class="text-gray-500 italic">No webhook calls or cron sweeps recorded yet.</p>' : ''}
              ${activityLogs.map(l => `
                <div class="p-2 rounded ${l.type === 'error' ? 'bg-red-900/40 text-red-200 border border-red-800' : l.type === 'success' ? 'bg-green-900/40 text-green-200 border border-green-800' : 'bg-gray-900 text-gray-300'}">
                  <span class="text-gray-500">[${l.time.split('T')[1].slice(0, 8)}]</span>
                  <span class="font-bold uppercase text-[10px] px-1 rounded ml-1 ${l.type === 'error' ? 'bg-red-800' : l.type === 'success' ? 'bg-green-800' : 'bg-gray-800'}">${l.type}</span>
                  <span class="ml-2">${l.msg}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <script>
          async function triggerOverdue() {
            const btn = event.target;
            btn.disabled = true;
            btn.innerText = "Running...";
            try {
              const res = await fetch('/trigger/daily-overdue', { method: 'POST' });
              const data = await res.json();
              alert('Workflow finished: ' + JSON.stringify(data, null, 2));
              location.reload();
            } catch (e) {
              alert('Error: ' + e.message);
            } finally {
              btn.disabled = false;
              btn.innerText = "Run Daily Overdue Workflow";
            }
          }
        </script>
      </body>
      </html>
    `);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  addLog(`n8n automation server listening on http://0.0.0.0:${PORT}`);
});
