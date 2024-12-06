import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
    name: v.string(),
    //OPTIONAL FIELDS
    profileDetails: v.optional(
      v.object({
        email: v.optional(v.string()),
        picture: v.optional(v.string()),
        height: v.optional(v.number()),
        weight: v.optional(v.number()),
      })
    ),
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

export const readUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const userInfo = await ctx.db
        .query("users")
        .filter((user) => {
          return user.eq(user.field("userId"), args.userId);
        })
        .first();

      return userInfo;
    } catch (error) {
      throw new Error("Reading user did not work");
    }
  },
});

export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm) return [];

    const searchTermLower = args.searchTerm.toLowerCase();

    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("userId"), args.currentUserId))
      .collect();

    return users
      .filter((user: any) => {
        const nameMatch = user?.name?.toLowerCase().includes(searchTermLower);

        const emailMatch = user?.email?.toLowerCase().includes(searchTermLower);

        return nameMatch || emailMatch;
      })
      .slice(0, 10);
  },
});

export const updateProfileDetails = mutation({
    args: {
      userId: v.string(),
      name: v.optional(v.string()), // Make name optional
      profileDetails: v.optional(
        v.object({
          email: v.optional(v.string()),
          picture: v.optional(v.string()),
          height: v.optional(v.number()),
          weight: v.optional(v.number()),
        })
      ),
    },
    handler: async (ctx, args) => {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();
  
      if (!user) {
        throw new Error("User not found");
      }
  
      // Prepare update object with only provided fields
      const updateData: Partial<{
        name?: string;
        profileDetails?: {
          email?: string;
          picture?: string;
          height?: number;
          weight?: number;
        };
      }> = {};
  
      // Add name to update if provided
      if (args.name) {
        updateData.name = args.name;
      }
  
      // Add profile details if provided
      if (args.profileDetails) {
        updateData.profileDetails = {};
        
        // Only add non-undefined fields to profileDetails
        if (args.profileDetails.email !== undefined) {
          updateData.profileDetails.email = args.profileDetails.email;
        }
        if (args.profileDetails.picture !== undefined) {
          updateData.profileDetails.picture = args.profileDetails.picture;
        }
        if (args.profileDetails.height !== undefined) {
          updateData.profileDetails.height = args.profileDetails.height;
        }
        if (args.profileDetails.weight !== undefined) {
          updateData.profileDetails.weight = args.profileDetails.weight;
        }
      }
  
      // Only patch if there are updates
      if (Object.keys(updateData).length > 0) {
        const updatedUser = await ctx.db.patch(user._id, updateData);
        return updatedUser;
      }
  
      // Return existing user if no updates
      return user;
    },
  });
