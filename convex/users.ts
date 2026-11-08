import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  // Search by tokenIdentifier first, then subject
  if (identity.tokenIdentifier) {
    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (byToken) return byToken;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
    .first();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Unauthorized: Authentication required.");
  }
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required.");
  }
  return user;
}

export const syncUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existing =
      (identity.tokenIdentifier &&
        (await ctx.db
          .query("users")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
          .first())) ||
      (await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
        .first());

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name || existing.name || "Neighbor",
        email: args.email || existing.email || "",
      });
      return existing._id;
    }

    // Only designated admin email or first account receives admin privileges
    const isAdmin = args.email === "shareef.banjar@gmail.com";

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier || identity.subject,
      name: args.name || "Neighbor",
      email: args.email || "",
      role: isAdmin ? "admin" : "user",
      isTrustedLender: isAdmin,
      createdAt: Date.now(),
    });
  },
});

export const seedUserInternal = mutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        role: args.role,
        isTrustedLender: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: args.tokenIdentifier,
      name: args.name,
      email: args.email,
      role: args.role,
      isTrustedLender: true,
      createdAt: Date.now(),
    });
  },
});

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    isTrusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, {
      isTrustedLender: args.isTrusted,
    });
  },
});
