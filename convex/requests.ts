import { query, mutation, action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, requireUser } from "./users";

/**
 * Dispatch HMAC-signed webhook to n8n asynchronously.
 * Only sends strictly minimized fields.
 */
export const dispatchWebhookAction = internalAction({
  args: {
    eventType: v.string(), // "request.created" | "request.status_changed"
    payload: v.string(),   // JSON stringified minimal payload
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_WEBHOOK_SECRET;

    if (!webhookUrl || !secret) {
      console.warn("n8n webhook URL or secret not configured, skipping notification dispatch.");
      return;
    }

    try {
      // Generate HMAC-SHA256 signature using Web Crypto API
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, enc.encode(args.payload));
      const signatureHex = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lendloop-signature": signatureHex,
          "x-lendloop-event": args.eventType,
        },
        body: args.payload,
      });

      if (!response.ok) {
        console.error(`n8n webhook responded with status ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to post webhook to n8n:", err);
    }
  },
});

/**
 * User requests to borrow a tool
 */
export const createRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool: any = await ctx.db.get(args.toolId);

    if (!tool) {
      throw new Error("Tool not found.");
    }
    if (tool.ownerId === user._id) {
      throw new Error("Cannot borrow your own tool.");
    }
    if (tool.status !== "available") {
      throw new Error("This tool is currently unavailable.");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("requests", {
      toolId: args.toolId,
      requesterId: user._id,
      ownerId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule minimal webhook dispatch
    const minimalPayload = JSON.stringify({
      requestId: requestId.toString(),
      eventType: "request.created",
      toolName: tool.name,
      startDate: args.startDate,
      endDate: args.endDate,
      targetUserId: tool.ownerId.toString(),
      recipientRole: "owner",
    });

    await ctx.scheduler.runAfter(0, internal.requests.dispatchWebhookAction, {
      eventType: "request.created",
      payload: minimalPayload,
    });

    return requestId;
  },
});

/**
 * Owner approves or declines a borrow request
 * Server-side RBAC: Only the tool owner can approve or decline
 */
export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("requests"),
    status: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found.");
    }

    // Server-side RBAC: Only tool owner can act on incoming requests
    if (request.ownerId !== user._id) {
      throw new Error("Forbidden: Only the tool owner can approve or decline this request.");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
    });

    const tool: any = await ctx.db.get(request.toolId);

    if (args.status === "approved" && tool) {
      // Mark tool as borrowed
      await ctx.db.patch(tool._id, { status: "borrowed" });

      // Create Active Loan record
      await ctx.db.insert("loans", {
        toolId: tool._id,
        requestId: request._id,
        borrowerId: request.requesterId,
        lenderId: request.ownerId,
        startDate: request.startDate,
        endDate: request.endDate,
        status: "active",
        reminderCount: 0,
        activityLog: [
          {
            timestamp: now,
            message: "Loan started and marked active.",
            source: "system",
          },
        ],
        processedIdempotencyKeys: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Schedule status changed webhook dispatch
    const minimalPayload = JSON.stringify({
      requestId: request._id.toString(),
      eventType: "request.status_changed",
      status: args.status,
      toolName: tool?.name || "Tool",
      targetUserId: request.requesterId.toString(),
      recipientRole: "borrower",
    });

    await ctx.scheduler.runAfter(0, internal.requests.dispatchWebhookAction, {
      eventType: "request.status_changed",
      payload: minimalPayload,
    });
  },
});

/**
 * Mark a loan / borrow request as returned
 * RBAC: Can be initiated by tool owner or borrower
 */
export const markReturned = mutation({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found.");
    }

    const isAuthorized = request.ownerId === user._id || request.requesterId === user._id || user.role === "admin";
    if (!isAuthorized) {
      throw new Error("Forbidden: You do not have permission to mark this loan returned.");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: "returned",
      updatedAt: now,
    });

    // Mark tool as available again
    await ctx.db.patch(request.toolId, { status: "available" });

    // Mark loan as returned
    const loan = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", request.toolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (loan) {
      const logs = loan.activityLog || [];
      logs.push({
        timestamp: now,
        message: "Tool successfully returned and closed.",
        source: "user",
      });
      await ctx.db.patch(loan._id, {
        status: "returned",
        activityLog: logs,
        updatedAt: now,
      });
    }
  },
});

/**
 * My borrow requests (items I requested from neighbors)
 */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (r) => {
        const tool: any = await ctx.db.get(r.toolId);
        const owner: any = await ctx.db.get(r.ownerId);
        return {
          ...r,
          toolName: tool?.name || "Deleted Tool",
          ownerName: owner?.name || "Neighbor",
        };
      })
    );
  },
});

/**
 * Incoming requests (requests made on tools I own)
 */
export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (r) => {
        const tool: any = await ctx.db.get(r.toolId);
        const requester: any = await ctx.db.get(r.requesterId);
        return {
          ...r,
          toolName: tool?.name || "Deleted Tool",
          requesterName: requester?.name || "Neighbor",
        };
      })
    );
  },
});
