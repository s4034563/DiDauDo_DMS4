import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locationRatings: defineTable({
    locationId: v.string(),
    sessionId: v.string(),
    rating: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_location_session", ["locationId", "sessionId"]),
  ratingSummaries: defineTable({
    locationId: v.string(),
    ratingCount: v.number(),
    ratingSum: v.number(),
    updatedAt: v.number(),
  }).index("by_locationId", ["locationId"]),
  curatedLocations: defineTable({
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
    tags: v.array(v.string()),
    curatorChoice: v.boolean(),
    caption: v.string(),
    address: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_location_id", ["id"]),
});
