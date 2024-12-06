import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateChat = mutation({
  args: {
    senderId: v.string(), // Clerk user ID of the sender
    participantIds: v.array(v.string()), // Array of Clerk user IDs of participants
    type: v.union(v.literal("private"), v.literal("group")),
  },
  handler: async (ctx, args) => {
    // Validate sender exists
    const senderUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.senderId))
      .first();

    if (!senderUser) {
      throw new Error("Sender user not found");
    }

    // Validate all participants exist and get their Convex IDs
    const participantUsers = await Promise.all(
      args.participantIds.map(async (participantId) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("userId"), participantId))
          .first();

        if (!user) {
          throw new Error(`Participant user ${participantId} not found`);
        }
        return user;
      })
    );

    // Ensure sender is included in participants
    const participantIds = [
      ...new Set([...participantUsers.map((u) => u._id), senderUser._id]),
    ];

    // For private chats, ensure only 2 participants
    if (args.type === "private" && participantIds.length > 2) {
      throw new Error("Private chat can only have 2 participants");
    }

    // Check for existing chat with exact same participants
    const existingChat = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("type"), args.type))
      .filter((q) => q.eq(q.field("participants"), participantIds))
      .first();

    if (existingChat) {
      return existingChat._id;
    }

    // Generate a unique chatId
    const chatId = crypto.randomUUID();

    // Create new chat
    const newChatId = await ctx.db.insert("chats", {
      senderId: senderUser._id,
      chatId: chatId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      participants: participantIds,
      type: args.type,
    });

    return newChatId;
  },
});
