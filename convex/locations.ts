import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const locationValidator = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  types: v.optional(v.array(v.string())),
  lat: v.number(),
  lng: v.number(),
  mediaType: v.string(),
  mediaURL: v.string(),
  thumbnailUrl: v.optional(v.string()),
  externalUrl: v.optional(v.string()),
  googleMapsUrl: v.optional(v.string()),
  tags: v.array(v.string()),
  detailedTags: v.optional(v.array(v.string())),
  hours: v.optional(v.object({
    monday: v.optional(v.object({ open: v.string(), close: v.string() })),
    tuesday: v.optional(v.object({ open: v.string(), close: v.string() })),
    wednesday: v.optional(v.object({ open: v.string(), close: v.string() })),
    thursday: v.optional(v.object({ open: v.string(), close: v.string() })),
    friday: v.optional(v.object({ open: v.string(), close: v.string() })),
    saturday: v.optional(v.object({ open: v.string(), close: v.string() })),
    sunday: v.optional(v.object({ open: v.string(), close: v.string() })),
  })),
  curatorChoice: v.boolean(),
  caption: v.string(),
  address: v.string(),
});

export const listLocations = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("curatedLocations").collect();
    return rows.sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const upsertLocation = mutation({
  args: { location: locationValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("curatedLocations")
      .withIndex("by_location_id", (q) => q.eq("id", args.location.id))
      .unique();

    if (!existing) {
      await ctx.db.insert("curatedLocations", {
        ...args.location,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, operation: "inserted" as const };
    }

    await ctx.db.patch(existing._id, {
      ...args.location,
      updatedAt: now,
    });
    return { ok: true, operation: "updated" as const };
  },
});

export const deleteLocation = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("curatedLocations")
      .withIndex("by_location_id", (q) => q.eq("id", args.id))
      .unique();

    if (!existing) {
      return { ok: true, deleted: false };
    }

    await ctx.db.delete(existing._id);
    return { ok: true, deleted: true };
  },
});
