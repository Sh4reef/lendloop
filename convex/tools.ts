import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireUser } from "./users";

/**
 * Public query for unauthenticated visitors:
 * Returns available tools with strict data minimization (name and category only, NO owner or sensitive details).
 */
export const listPublicTools = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"));

    const tools = await q.collect();

    let filtered = tools;
    if (args.category && args.category !== "all") {
      filtered = tools.filter((t) => t.category === args.category);
    }

    // Explicit data minimization: strip ownerId, description, and timestamps for unauthenticated viewers
    return filtered.map((t) => ({
      _id: t._id,
      name: t.name,
      category: t.category,
      status: t.status,
    }));
  },
});

/**
 * Authenticated query:
 * Returns tools with full condition, description, and owner trust status for logged-in members.
 */
export const listTools = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    let allTools = await ctx.db.query("tools").order("desc").collect();

    if (args.category && args.category !== "all") {
      allTools = allTools.filter((t) => t.category === args.category);
    }

    // Attach lender badge
    return await Promise.all(
      allTools.map(async (tool) => {
        const owner: any = await ctx.db.get(tool.ownerId);
        return {
          ...tool,
          ownerName: owner?.name || "Neighbor",
          isTrustedLender: owner?.isTrustedLender || false,
          isOwner: user ? tool.ownerId === user._id : false,
        };
      })
    );
  },
});

/**
 * Get current user's listings
 */
export const getMyListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Create a new tool listing
 * Enforces authenticated user ownership
 */
export const createTool = mutation({
  args: {
    name: v.string(),
    category: v.union(
      v.literal("power tools"),
      v.literal("garden"),
      v.literal("kitchen"),
      v.literal("camping"),
      v.literal("other")
    ),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name: args.name,
      category: args.category,
      condition: args.condition,
      description: args.description,
      status: "available",
      createdAt: Date.now(),
    });
  },
});

/**
 * Edit an existing listing
 * RBAC: Only the tool owner can edit
 */
export const updateTool = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: v.union(
      v.literal("power tools"),
      v.literal("garden"),
      v.literal("kitchen"),
      v.literal("camping"),
      v.literal("other")
    ),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool) {
      throw new Error("Tool not found.");
    }

    // Server-side RBAC: Non-admin can only edit their own tool
    if (tool.ownerId !== user._id && user.role !== "admin") {
      throw new Error("Forbidden: You can only edit your own listings.");
    }

    await ctx.db.patch(args.toolId, {
      name: args.name,
      category: args.category,
      condition: args.condition,
      description: args.description,
    });
  },
});

/**
 * Delete a listing
 * RBAC: Admins can delete any listing; regular users can only delete their own listings
 */
export const deleteTool = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool) {
      throw new Error("Tool not found.");
    }

    const isOwner = tool.ownerId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: You do not have permission to delete this listing.");
    }

    await ctx.db.delete(args.toolId);
  },
});
