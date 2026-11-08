import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin } from "./users";

/**
 * Internal query for HTTP cron actions
 */
export const getAllLoansAdminInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const loans = await ctx.db.query("loans").order("desc").collect();

    return await Promise.all(
      loans.map(async (l) => {
        const tool: any = await ctx.db.get(l.toolId);
        const borrower: any = await ctx.db.get(l.borrowerId);
        const lender: any = await ctx.db.get(l.lenderId);
        return {
          ...l,
          toolName: tool?.name || "Unknown Tool",
          borrowerName: borrower?.name || "Unknown Borrower",
          borrowerEmail: borrower?.email || "borrower@example.com",
          lenderName: lender?.name || "Unknown Lender",
        };
      })
    );
  },
});

/**
 * Admin view: inspect all loans across the platform
 */
export const getAllLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").collect();

    return await Promise.all(
      loans.map(async (l) => {
        const tool: any = await ctx.db.get(l.toolId);
        const borrower: any = await ctx.db.get(l.borrowerId);
        const lender: any = await ctx.db.get(l.lenderId);
        return {
          ...l,
          toolName: tool?.name || "Unknown Tool",
          borrowerName: borrower?.name || "Unknown Borrower",
          lenderName: lender?.name || "Unknown Lender",
        };
      })
    );
  },
});

/**
 * User view: loans relevant to the current user (as borrower or lender)
 * Includes the bonus: automation activity log ("Reminder sent 2 days ago")
 */
export const getMyLoans = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const asBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();

    const asLender = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();

    const map = new Map();
    for (const l of [...asBorrower, ...asLender]) {
      map.set(l._id, l);
    }

    const all = Array.from(map.values());
    return await Promise.all(
      all.map(async (l) => {
        const tool: any = await ctx.db.get(l.toolId);
        return {
          ...l,
          toolName: tool?.name || "Unknown Tool",
          isBorrower: l.borrowerId === user._id,
        };
      })
    );
  },
});

/**
 * Idempotent mutation called by n8n or internal cron to record an overdue reminder.
 * Prevents duplicate alerts and duplicate log entries on retries.
 */
export const recordOverdueReminder = mutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(), // e.g. "reminder-loanId-2026-11-08"
    channel: v.string(),        // e.g. "email" or "notification"
  },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Loan not found");
    }

    const processedKeys = loan.processedIdempotencyKeys || [];
    if (processedKeys.includes(args.idempotencyKey)) {
      // Idempotent: already processed this reminder run, ignore gracefully
      return { status: "already_processed", loanId: loan._id };
    }

    const now = Date.now();
    const newLogs = loan.activityLog || [];
    newLogs.push({
      timestamp: now,
      message: `Automated overdue reminder dispatched via ${args.channel}.`,
      source: "n8n_automation",
    });

    processedKeys.push(args.idempotencyKey);

    await ctx.db.patch(loan._id, {
      status: "overdue",
      lastReminderSentAt: now,
      reminderCount: (loan.reminderCount || 0) + 1,
      activityLog: newLogs,
      processedIdempotencyKeys: processedKeys,
      updatedAt: now,
    });

    return { status: "updated", loanId: loan._id };
  },
});
