import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.optional(v.string()), // Clerk user ID or subject
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    isTrustedLender: v.optional(v.boolean()),
    isAnonymous: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  tools: defineTable({
    ownerId: v.id("users"),
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
    status: v.union(v.literal("available"), v.literal("borrowed")),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  requests: defineTable({
    toolId: v.id("tools"),
    requesterId: v.id("users"),
    ownerId: v.id("users"),
    startDate: v.string(), // ISO date string
    endDate: v.string(),   // ISO date string
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_requester", ["requesterId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  loans: defineTable({
    toolId: v.id("tools"),
    requestId: v.id("requests"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("overdue"),
      v.literal("returned")
    ),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.number(),
    activityLog: v.array(
      v.object({
        timestamp: v.number(),
        message: v.string(),
        source: v.string(),
      })
    ),
    processedIdempotencyKeys: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_tool", ["toolId"]),
});
