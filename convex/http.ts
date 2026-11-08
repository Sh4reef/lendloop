import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * Endpoint for n8n daily cron to fetch overdue loans.
 * Protected with Bearer secret token from environment variables.
 */
http.route({
  path: "/api/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.CONVEX_INTERNAL_CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Query active loans whose endDate is prior to today
    const loans = await ctx.runQuery(api.loans.getAllLoansAdminInternal, {});
    const overdue = loans.filter(
      (l: any) => l.status === "active" && l.endDate < todayStr
    );

    // Minimize data exposed to n8n (only what is strictly needed for reminder dispatch)
    const sanitized = overdue.map((l: any) => ({
      loanId: l._id,
      toolName: l.toolName,
      borrowerEmail: l.borrowerEmail,
      borrowerName: l.borrowerName,
      endDate: l.endDate,
      reminderCount: l.reminderCount,
    }));

    return new Response(JSON.stringify({ overdueLoans: sanitized }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Endpoint for n8n write-back to record sent reminder idempotently.
 */
http.route({
  path: "/api/record-reminder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.CONVEX_INTERNAL_CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { loanId, idempotencyKey, channel } = body;

      if (!loanId || !idempotencyKey) {
        return new Response(
          JSON.stringify({ error: "Missing loanId or idempotencyKey" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const res = await ctx.runMutation(api.loans.recordOverdueReminder, {
        loanId,
        idempotencyKey,
        channel: channel || "email",
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
