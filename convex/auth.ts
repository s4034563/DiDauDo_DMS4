"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const signup = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const emailLower = args.email.toLowerCase();
    
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .unique();

    if (existing) {
      throw new Error("User already exists with this email");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: emailLower,
      passwordHash: hashPassword(args.password),
      name: args.name || args.email.split("@")[0],
      createdAt: now,
      updatedAt: now,
    });

    return { 
      ok: true, 
      userId, 
      email: emailLower,
      name: args.name || args.email.split("@")[0],
    };
  },
});

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const passwordHash = hashPassword(args.password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Invalid password");
    }

    return { 
      ok: true, 
      userId: user._id, 
      email: user.email,
      name: user.name,
    };
  },
});
