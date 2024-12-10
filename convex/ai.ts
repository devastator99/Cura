import { generateGPTResponse } from "./gptHelper";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createAIConversation = mutation({
  args: {
    userId: v.string(),
    aiName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, aiName = "AI Assistant" } = args;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const newChat = await ctx.db.insert("chats", {
      senderId: user._id,
      chatId: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      participants: [user._id],
      type: "private",
    });

    const welcomePrompt = `You're an AI assistant. Welcome the user warmly.`;
    const welcomeMessage = await generateGPTResponse(welcomePrompt);

    await ctx.db.insert("messages", {
      messageId: crypto.randomUUID(),
      chatId: newChat,
      senderId: null,
      content: welcomeMessage,
      type: "text",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isAI: true,
    });

    return newChat;
  },
});


import { generateGPTResponse } from "./gptHelper";

export const getAIConversation = mutation({
  args: {
    chatId: v.string(),
    userMessage: v.string(), // User's new message
  },
  handler: async (ctx, args) => {
    const { chatId, userMessage } = args;

    const chat = await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("chatId"), chatId))
      .first();

    if (!chat) {
      throw new Error("AI Chat not found");
    }

    // Insert user's message into the database
    const userMessageId = await ctx.db.insert("messages", {
      messageId: crypto.randomUUID(),
      chatId: chat._id,
      senderId: chat.senderId,
      content: userMessage,
      type: "text",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isAI: false,
    });

    // Generate AI response
    const aiPrompt = `User: ${userMessage}\nAssistant:`;
    const aiResponse = await generateGPTResponse(aiPrompt);

    await ctx.db.insert("messages", {
      messageId: crypto.randomUUID(),
      chatId: chat._id,
      senderId: null,
      content: aiResponse,
      type: "text",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isAI: true,
    });

    return {
      userMessageId,
      aiResponse,
    };
  },
});


export const getOrCreateAIConversation = mutation({
    args: {
      userId: v.string(),
      userMessage: v.optional(v.string()), // Optional user message to handle dynamic prompts
    },
    handler: async (ctx, args) => {
      const { userId, userMessage } = args;
  
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
  
      if (!user) {
        throw new Error("User not found");
      }
  
      const existingChat = await ctx.db
        .query("chats")
        .filter((q) => q.and(
          q.eq(q.field("senderId"), user._id),
          q.eq(q.field("type"), "private")
        ))
        .first();
  
      if (existingChat) {
        if (userMessage) {
          // Handle the user's new message dynamically
          return getAIConversation(ctx, { chatId: existingChat.chatId, userMessage });
        }
        return existingChat;
      }
  
      // Create a new AI conversation if none exists
      return createAIConversation(ctx, { userId });
    },
  });
  