import { v } from "convex/values";
import { mutation, query } from "./_generated/server";



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
  
  
  // Delete a message
  export const deleteMessage = mutation({
    args: {
      messageId: v.string(),
      chatId: v.string(),
    },
    handler: async (ctx, args) => {
      // Get the message
      const message = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("messageId"), args.messageId))
        .first();
      if (!message) throw new Error("Message not found");
  
      // Get the chat
      const chat = await ctx.db
        .query("chats")
        .filter((q) => q.eq(q.field("chatId"), args.chatId))
        .first();
      if (!chat) throw new Error("Chat not found");
  
      // Delete the message
      await ctx.db.delete(message._id);
  
      // Update lastMessageId if necessary
      if (chat.lastMessageId === message._id) {
        // Get the most recent message in the chat
        const unorderedrecentMessage = await ctx.db
          .query("messages")
          .filter((q) => q.eq(q.field("chatId"), chat._id))
          .first();
  
        const recentMessage = unorderedrecentMessage.sort((a :any, b :any) => b.createdAt - a.createdAt);
  
        await ctx.db.patch(chat._id, {
          lastMessageId: recentMessage ? recentMessage._id : null,
          updatedAt: Date.now(),
        });
      }
  
      return { success: true };
    },
  });
  