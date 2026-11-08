// Automated RBAC & Server-Side Security Verification Script

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://cheery-mole-696.convex.site";
const CONVEX_CLOUD_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://cheery-mole-696.convex.cloud";
const CRON_SECRET = process.env.CONVEX_INTERNAL_CRON_SECRET || "lendloop_cron_secret_token_12345";

async function runRbacVerification() {
  console.log("=== LENDLOOP SERVER-SIDE RBAC AUDIT ===");
  let passed = 0;
  let total = 0;

  // Test 1: HTTP Overdue Loans Action requires Bearer token
  total++;
  try {
    const res = await fetch(`${CONVEX_SITE_URL}/api/overdue-loans`);
    if (res.status === 401) {
      console.log("✓ PASS: /api/overdue-loans correctly rejects unauthenticated requests (HTTP 401)");
      passed++;
    } else {
      console.error(`✗ FAIL: /api/overdue-loans returned ${res.status}, expected 401`);
    }
  } catch (err) {
    console.error("✗ ERROR testing /api/overdue-loans unauthenticated:", err.message);
  }

  // Test 2: HTTP Overdue Loans Action allows valid Bearer token
  total++;
  try {
    const res = await fetch(`${CONVEX_SITE_URL}/api/overdue-loans`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`✓ PASS: /api/overdue-loans accepts authorized secret (HTTP 200, count: ${data.overdueLoans?.length ?? 0})`);
      passed++;
    } else {
      console.error(`✗ FAIL: /api/overdue-loans returned ${res.status} with valid token`);
    }
  } catch (err) {
    console.error("✗ ERROR testing /api/overdue-loans authorized:", err.message);
  }

  // Test 3: HTTP Record Reminder rejects missing/invalid token
  total++;
  try {
    const res = await fetch(`${CONVEX_SITE_URL}/api/record-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId: "test", idempotencyKey: "test" }),
    });
    if (res.status === 401) {
      console.log("✓ PASS: /api/record-reminder rejects unauthenticated mutation (HTTP 401)");
      passed++;
    } else {
      console.error(`✗ FAIL: /api/record-reminder returned ${res.status}, expected 401`);
    }
  } catch (err) {
    console.error("✗ ERROR testing /api/record-reminder unauthenticated:", err.message);
  }

  // Test 4: Convex Query Data Minimization
  total++;
  try {
    const res = await fetch(`${CONVEX_CLOUD_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "tools:listPublicTools",
        args: {},
        format: "json",
      }),
    });
    const result = await res.json();
    if (result.status === "success") {
      const tools = result.value || [];
      const hasLeakedPii = tools.some((t) => t.ownerId || t.ownerEmail || t.description);
      if (!hasLeakedPii) {
        console.log(`✓ PASS: tools:listPublicTools strictly minimizes data (NO ownerId or PII exposed, count: ${tools.length})`);
        passed++;
      } else {
        console.error("✗ FAIL: tools:listPublicTools exposed sensitive fields in public query");
      }
    } else {
      console.error("✗ FAIL: tools:listPublicTools returned error status:", result);
    }
  } catch (err) {
    console.error("✗ ERROR querying tools:listPublicTools:", err.message);
  }

  // Test 5: Convex Unauthenticated listTools Fallback Data Minimization
  total++;
  try {
    const res = await fetch(`${CONVEX_CLOUD_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "tools:listTools",
        args: {},
        format: "json",
      }),
    });
    const result = await res.json();
    if (result.status === "success") {
      const tools = result.value || [];
      const hasOwnerLeak = tools.some((t) => t.isOwner === true);
      if (!hasOwnerLeak) {
        console.log(`✓ PASS: tools:listTools enforces data minimization when unauthenticated (isOwner: false, count: ${tools.length})`);
        passed++;
      } else {
        console.error("✗ FAIL: unauthenticated listTools claimed ownership");
      }
    }
  } catch (err) {
    console.error("✗ ERROR querying tools:listTools:", err.message);
  }

  // Test 6: Convex Mutation Server-Side Auth Guard (createTool rejected without auth)
  total++;
  try {
    const res = await fetch(`${CONVEX_CLOUD_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "tools:createTool",
        args: {
          name: "Attacker Tool",
          category: "power tools",
          condition: "New",
          description: "Malicious injection",
        },
        format: "json",
      }),
    });
    const result = await res.json();
    if (result.status === "error" && result.errorMessage?.includes("Unauthorized")) {
      console.log("✓ PASS: tools:createTool rejects unauthenticated caller with server-enforced Unauthorized exception");
      passed++;
    } else {
      console.error("✗ FAIL: tools:createTool did not enforce server-side auth guard:", result);
    }
  } catch (err) {
    console.error("✗ ERROR mutating tools:createTool:", err.message);
  }

  // Test 7: Convex Mutation Admin Guard (setTrustedLender rejected without admin identity)
  total++;
  try {
    const res = await fetch(`${CONVEX_CLOUD_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "users:setTrustedLender",
        args: {
          userId: "k57dpgm165m90h0gtw2nx2vqp58htqe5",
          isTrusted: true,
        },
        format: "json",
      }),
    });
    const result = await res.json();
    if (result.status === "error" && result.errorMessage?.includes("Unauthorized")) {
      console.log("✓ PASS: users:setTrustedLender rejects non-admin caller at server boundary");
      passed++;
    } else {
      console.error("✗ FAIL: users:setTrustedLender did not enforce admin guard:", result);
    }
  } catch (err) {
    console.error("✗ ERROR mutating users:setTrustedLender:", err.message);
  }

  console.log(`\nRBAC AUDIT SUMMARY: ${passed}/${total} checks passed.`);
  return passed === total;
}

runRbacVerification().then((ok) => {
  if (!ok) process.exit(1);
});
