"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";
import { api } from "./_generated/api";

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Action: Signup with crypto hashing
export const signup = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();
    const displayName = args.name || args.email.split("@")[0];
    
    // Check if user already exists
    const existing = await ctx.runMutation(api.authHelpers.checkUserExists, {
      email: emailLower,
    });

    if (existing) {
      throw new Error("User already exists with this email");
    }

    // Hash password
    const passwordHash = hashPassword(args.password);

    // Create new user
    const result = await ctx.runMutation(api.authHelpers.createUser, {
      email: emailLower,
      passwordHash,
      name: displayName,
    });

    return { 
      ok: true, 
      userId: result.userId,
      email: result.email,
      name: result.name,
    };
  },
});

// Action: Login with crypto hashing
export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();
    
    // Get user
    const user = await ctx.runMutation(api.authHelpers.getUserByEmail, {
      email: emailLower,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Hash and verify password
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
