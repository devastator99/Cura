import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendNotification = mutation({
    args: {
      userId: v.string(),
      type: v.string(),
      content: v.string(),
    },
    handler: async (ctx, args) => {
      const { userId, type, content } = args;
  
      return await ctx.db.insert("notifications", {
        notificationId: crypto.randomUUID(),
        userId,
        type,
        content,
        isRead: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    },
  });


  export const getNotifications = query({
    args: {
      userId: v.string(),
    },
    handler: async (ctx, args) => {
      const { userId } = args;
  
      const notificationunsorted =  await ctx.db
        .query("notifications")
        .filter((q) => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("isRead"), false)))
        .collect();

        const notifications = notificationunsorted.sort((a, b) => b.createdAt - a.createdAt);
        return notifications;
    },
  });

  export const markNotificationAsRead = mutation({
    args: {
      notificationId: v.string(),
    },
    handler: async (ctx, args) => {
      const { notificationId } = args;

      const notification = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("notificationId"), notificationId))
        .first();
      
      if (!notification) return;
      
      return await ctx.db.patch(notification._id, { isRead: true });
    },
  });
  
  
  

  export const expireOldNotifications = mutation({
    args: {
      days: v.number(),
    },
    handler: async (ctx, args) => {
      const { days } = args;
      const expiryTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
      const oldNotifications = await ctx.db
        .query("notifications")
        .filter((q) => q.lt(q.field("createdAt"), expiryTime))
        .collect();
  
      for (const notification of oldNotifications) {
        await ctx.db.delete(notification._id);
      }
      
      return oldNotifications.length;
    },
  });
  