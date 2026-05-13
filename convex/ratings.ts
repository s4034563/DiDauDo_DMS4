import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ratingValidator = v.number();

function normalizeRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

export const getSummary = query({
  args: {
    locationId: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("ratingSummaries")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .unique();

    let userRating = 0;

    if (args.sessionId) {
      const vote = await ctx.db
        .query("locationRatings")
        .withIndex("by_location_session", (q) =>
          q.eq("locationId", args.locationId).eq("sessionId", args.sessionId),
        )
        .unique();

      userRating = vote?.rating ?? 0;
    }

    const ratingCount = summary?.ratingCount ?? 0;
    const ratingSum = summary?.ratingSum ?? 0;

    return {
      locationId: args.locationId,
      ratingCount,
      ratingSum,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
      userRating,
    };
  },
});

export const submitRating = mutation({
  args: {
    locationId: v.string(),
    sessionId: v.string(),
    rating: ratingValidator,
  },
  handler: async (ctx, args) => {
    const rating = normalizeRating(args.rating);
    const now = Date.now();

    const existingVote = await ctx.db
      .query("locationRatings")
      .withIndex("by_location_session", (q) =>
        q.eq("locationId", args.locationId).eq("sessionId", args.sessionId),
      )
      .unique();

    const existingSummary = await ctx.db
      .query("ratingSummaries")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .unique();

    let ratingCount = existingSummary?.ratingCount ?? 0;
    let ratingSum = existingSummary?.ratingSum ?? 0;

    if (existingVote) {
      ratingSum += rating - existingVote.rating;
      await ctx.db.patch(existingVote._id, {
        rating,
        updatedAt: now,
      });
    } else {
      ratingCount += 1;
      ratingSum += rating;
      await ctx.db.insert("locationRatings", {
        locationId: args.locationId,
        sessionId: args.sessionId,
        rating,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!existingSummary) {
      await ctx.db.insert("ratingSummaries", {
        locationId: args.locationId,
        ratingCount,
        ratingSum,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingSummary._id, {
        ratingCount,
        ratingSum,
        updatedAt: now,
      });
    }

    return {
      locationId: args.locationId,
      ratingCount,
      ratingSum,
      averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
      userRating: rating,
    };
  },
});

// New: User-based ratings with comments
export const submitUserRating = mutation({
  args: {
    locationId: v.string(),
    userId: v.id("users"),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rating = normalizeRating(args.rating);

    // Check if user already rated this location
    const existing = await ctx.db
      .query("userRatings")
      .withIndex("by_location_user", (q) =>
        q.eq("locationId", args.locationId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating,
        comment: args.comment,
        updatedAt: now,
      });
      return { ok: true, operation: "updated" };
    } else {
      await ctx.db.insert("userRatings", {
        locationId: args.locationId,
        userId: args.userId,
        rating,
        comment: args.comment,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, operation: "created" };
    }
  },
});

export const getUserRatings = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("userRatings")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    // Sort by newest first
    return ratings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getUserRatingForLocation = query({
  args: { locationId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userRatings")
      .withIndex("by_location_user", (q) =>
        q.eq("locationId", args.locationId).eq("userId", args.userId),
      )
      .unique();
  },
});

export const deleteUserRating = mutation({
  args: { locationId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userRatings")
      .withIndex("by_location_user", (q) =>
        q.eq("locationId", args.locationId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { ok: true, deleted: true };
    }
    return { ok: true, deleted: false };
  },
});

// Favorites
export const toggleFavorite = mutation({
  args: {
    locationId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("userFavorites")
      .withIndex("by_location_user", (q) =>
        q.eq("locationId", args.locationId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { ok: true, isFavorite: false };
    } else {
      await ctx.db.insert("userFavorites", {
        locationId: args.locationId,
        userId: args.userId,
        createdAt: now,
      });
      return { ok: true, isFavorite: true };
    }
  },
});

export const isFavorite = query({
  args: { locationId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("userFavorites")
      .withIndex("by_location_user", (q) =>
        q.eq("locationId", args.locationId).eq("userId", args.userId),
      )
      .unique();

    return !!favorite;
  },
});

export const getUserFavorites = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});