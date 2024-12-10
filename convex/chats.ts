import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";


// Get chats for a specific user
export const getChats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's Convex ID
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) throw new Error("User not found");

    // Get all chats
    const chats = await ctx.db
      .query("chats")
      .collect();

      //VERY IMPORTANT LEARNING FOR TYPESCRIPT
    // Filter chats where user is a participant
    const userChats = chats.filter(chat => 
      chat.participants.find((id: Id<"users">) => id === user._id)
    );

    // Enrich chats with participant details and last message
    return Promise.all(userChats.map(async (chat) => {
      const participants = await Promise.all(
        chat.participants.map(async (participantId: any) => {
          const user = await ctx.db.get(participantId);
          return {
            _id: user!._id,
            userId: user!.userId,
            name: user!.name,
          };
        })
      );

      const lastMessage = chat.lastMessageId 
        ? await ctx.db.get(chat.lastMessageId)
        : null;

      return {
        ...chat,
        participants,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId
        } : null
      };
    }));
  }
});

// Create a new chat
export const createChat = mutation({
  args: {
    senderId: v.string(),
    participantIds: v.array(v.string()),
    type: v.union(v.literal("private"), v.literal("group")),
  },
  handler: async (ctx, args) => {
    // Get sender's Convex ID
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.senderId))
      .first();
    if (!sender) throw new Error("Sender not found");

    // Get participants' Convex IDs
    const participants = await Promise.all(
      args.participantIds.map(async (id) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("userId"), id))
          .first();
        if (!user) throw new Error(`Participant ${id} not found`);
        return user._id;
      })
    );

    // Add sender to participants if not included
    const allParticipants = [...new Set([...participants, sender._id])];
    
    if (args.type === "private" && allParticipants.length !== 2) {
      throw new Error("Private chats must have exactly 2 participants");
    }

    // Create chat
    return ctx.db.insert("chats", {
      senderId: sender._id,
      chatId: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      participants: allParticipants,
      type: args.type,
    });
  },
});

// Get existing chat or create new one
export const getOrCreateChat = mutation({
  args: {
    senderId: v.string(),
    participantIds: v.array(v.string()),
    type: v.union(v.literal("private"), v.literal("group")),
  },
  handler: async (ctx, args) => {
    // Get sender's Convex ID
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.senderId))
      .first();
    if (!sender) throw new Error("Sender not found");

    // Get participants' Convex IDs
    const participants = await Promise.all(
      args.participantIds.map(async (id) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("userId"), id))
          .first();
        if (!user) throw new Error(`Participant ${id} not found`);
        return user._id;
      })
    );

    // Add sender to participants if not included
    const allParticipants = [...new Set([...participants, sender._id])];

    // Get all chats of the specified type
    const chats = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect();

    // Find a chat with exactly these participants
    const existingChat = chats.find(chat => {
      if (chat.participants.length !== allParticipants.length) return false;
      return allParticipants.every(participantId => 
        chat.participants.includes(participantId)
      );
    });

    if (existingChat) return existingChat._id;

    // Create new chat if none exists
    return createChat(ctx, args);
  },
});


// Send a message
export const sendMessage = mutation({
  args: {
    chatId: v.string(),
    senderId: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file")
    ),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get sender's Convex ID
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.senderId))
      .first();
    if (!sender) throw new Error("Sender not found");

    // Get chat's Convex ID
    const chat = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("chatId"), args.chatId))
      .first();
    if (!chat) throw new Error("Chat not found");

    // Insert the new message
    const messageId = await ctx.db.insert("messages", {
      messageId: crypto.randomUUID(),
      chatId: chat._id,
      senderId: sender._id,
      content: args.content,
      type: args.type,
      mediaUrl: args.mediaUrl || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update chat's lastMessageId and updatedAt
    await ctx.db.patch(chat._id, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
    });

    return messageId;
  },
});


// Get messages for a chat
export const getMessages = query({
  args: {
    chatId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("chatId"), args.chatId))
      .first();
    if (!chat) throw new Error("Chat not found");

    const limit = args.limit || 50; // Default limit to 50 messages
    const offset = args.offset || 0;

    // Query messages for the chat
    const notsortedmessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("chatId"), chat._id)) 
      .take(limit);

    const messages = notsortedmessages.sort((a :any, b :any) => b.createdAt - a.createdAt);


    return messages.map((message :any) => ({
      ...message,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      mediaUrl: message.mediaUrl,
      createdAt: message.createdAt,
    }));
  },
});
