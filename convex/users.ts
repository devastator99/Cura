import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
    args: {
      userId: v.string(),
      role: v.union(v.literal("user"), v.literal("admin")),
      createdAt: v.number(),
      name: v.string(),
      //OPTIONAL FIELDS
      profileDetails: v.optional(v.object({
        email: v.optional(v.string()),
        picture: v.optional(v.string()),
        height: v.optional(v.number()),
        weight: v.optional(v.number()),
      })),
    },
    handler: async (ctx, args) => {
      try {
        const newUser = await ctx.db.insert("users", {
          userId: args.userId,
          role: args.role,
          createdAt: args.createdAt,
          name: args.name,
        });

        if (args.profileDetails) {
          await ctx.db.patch(newUser, {
            profileDetails: args.profileDetails,
          });
        }
        return newUser;
      } catch (error) {
        throw new Error("User informated did not insert successfully");
      }
    },
  });