import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
    name: v.string(),
    // optional fields
    profileDetails: v.optional(
      v.object({
        email: v.optional(v.string()),
        picture: v.optional(v.string()),
        height: v.optional(v.number()),
        weight: v.optional(v.number()),
      })
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"]),

  chats: defineTable({
    senderId: v.id("users"),
    chatId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    participants: v.array(v.id("users")),
    lastMessageId: v.optional(v.id("messages")), //ensure proper consistency in logic
    type: v.union(v.literal("group"), v.literal("private")),
  })
    .index("by_participants", ["participants"])
    .index("by_senderId", ["senderId"])
    .index("by_chatId", ["chatId"])
    .index("by_updated", ["updatedAt"]),

  messages: defineTable({
    messageId: v.string(),
    chatId: v.id("chats"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file")
    ),
    mediaUrl: v.optional(v.string()),
    replyTo: v.optional(v.id("users")),
    isAI: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_chatId", ["chatId"])
    .index("by_senderId", ["senderId"]),

  media: defineTable({
    messageId: v.id("messages"),
    url: v.string(),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file")
    ),
    size: v.optional(v.number()),
    mimeType: v.string(),
    duration: v.optional(v.number()), //absolutely required for video and audio
    fileName: v.string(),
    createdAt: v.number(),
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        resolution: v.optional(v.string()),
        bitRate: v.optional(v.number()),
      })
    ),
  })
    .index("by_messageId", ["messageId"])
    .index("by_type", ["type"]),

  ai: defineTable({
    messageId: v.id("messages"),
    senderId: v.id("users"),
    content: v.optional(v.string()),
    mediaId: v.optional(v.id("media")),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file")
    ),
    fileName: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        // Add metadata for additional details
        width: v.optional(v.number()), 
        height: v.optional(v.number()), 
        duration: v.optional(v.number()), 
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_type", ["type"]),

  notifications: defineTable({
    notificationId: v.string(),
    userId: v.id("users"), // Clerk user ID
    type: v.union(
      v.literal("message"),
      v.literal("reminder")
    ),
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })

  .index("by_userId", ["userId"]),

});
