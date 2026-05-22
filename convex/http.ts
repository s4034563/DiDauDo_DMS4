import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();
const apiAny = api as any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/ratings",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/ratings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    const locationId = typeof payload?.locationId === "string" ? payload.locationId : "";
    const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : "";
    const rating = Number(payload?.rating);

    if (!locationId) {
      return new Response(JSON.stringify({ error: "locationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "rating must be an integer from 1 to 5" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary = await ctx.runMutation(apiAny.ratings.submitRating, { locationId, sessionId, rating });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/ratings",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") || "";
    const sessionId = url.searchParams.get("sessionId") || "";

    if (!locationId) {
      return new Response(JSON.stringify({ error: "locationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary = await ctx.runQuery(apiAny.ratings.getSummary, {
      locationId,
      sessionId: sessionId || undefined,
    });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/locations",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/locations",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const rows = await ctx.runQuery(apiAny.locations.listLocations, {});
    return new Response(JSON.stringify({ locations: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/locations",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    const location = payload?.location ?? payload;

    if (!location || typeof location.id !== "string") {
      return new Response(JSON.stringify({ error: "location payload is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(apiAny.locations.upsertLocation, { location });

    const rows = await ctx.runQuery(apiAny.locations.listLocations, {});
    return new Response(JSON.stringify({ ok: true, locations: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/locations",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";

    if (!id) {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(apiAny.locations.deleteLocation, { id });

    const rows = await ctx.runQuery(apiAny.locations.listLocations, {});
    return new Response(JSON.stringify({ ok: true, locations: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/search",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/search",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "query parameter 'q' must be at least 2 characters", locations: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allLocations = await ctx.runQuery(apiAny.locations.listLocations, {});
    const searchLower = query.toLowerCase();
    
    // Filter locations by name or address substring match
    const results = allLocations.filter(loc => 
      (typeof loc.name === "string" && loc.name.toLowerCase().includes(searchLower)) ||
      (typeof loc.address === "string" && loc.address.toLowerCase().includes(searchLower))
    );

    return new Response(JSON.stringify({ query, locations: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// Auth endpoints
http.route({
  path: "/api/auth/signup",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/auth/signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runAction(apiAny.auth.signup, {
        email: payload.email,
        password: payload.password,
        name: payload.name,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Signup failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/auth/login",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runAction(apiAny.auth.login, {
        email: payload.email,
        password: payload.password,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Login failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// User ratings endpoints
http.route({
  path: "/api/user-ratings",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/user-ratings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runMutation(apiAny.ratings.submitUserRating, {
        locationId: payload.locationId,
        userId: payload.userId,
        rating: Number(payload.rating),
        comment: payload.comment || "",
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Rating failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/user-ratings",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") || "";

    if (!locationId) {
      return new Response(JSON.stringify({ error: "locationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ratings = await ctx.runQuery(apiAny.ratings.getUserRatings, { locationId });
    return new Response(JSON.stringify({ locationId, ratings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/user-ratings",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runMutation(apiAny.ratings.deleteUserRating, {
        locationId: payload.locationId,
        userId: payload.userId,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Delete failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// Favorites endpoints
http.route({
  path: "/api/favorites",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/favorites",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runMutation(apiAny.ratings.toggleFavorite, {
        locationId: payload.locationId,
        userId: payload.userId,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Toggle failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/favorites",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") || "";
    const userId = url.searchParams.get("userId") || "";

    if (!locationId || !userId) {
      return new Response(JSON.stringify({ error: "locationId and userId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFav = await ctx.runQuery(apiAny.ratings.isFavorite, {
      locationId,
      userId: userId as any,
    });
    return new Response(JSON.stringify({ locationId, userId, isFavorite: isFav }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// Friends endpoints
http.route({
  path: "/api/friends/request",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/friends/request",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runMutation(apiAny.friends.sendFriendRequestByEmail, {
        senderId: payload.senderId,
        receiverEmail: payload.receiverEmail,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Friend request failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/friends/respond",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/friends/respond",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const result = await ctx.runMutation(apiAny.friends.respondToFriendRequest, {
        requestId: payload.requestId,
        userId: payload.userId,
        action: payload.action,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Response failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/friends",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "";

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const friends = await ctx.runQuery(apiAny.friends.getFriends, { userId: userId as any });
    const requests = await ctx.runQuery(apiAny.friends.getFriendRequests, { userId: userId as any });

    return new Response(JSON.stringify({ userId, friends, requests }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/profile",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "";

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = await ctx.runQuery(apiAny.friends.getUserProfile, { userId: userId as any });
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/favorites/compare",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "";
    const friendIds = url.searchParams.getAll("friendId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compare = await ctx.runQuery(apiAny.friends.compareFavorites, {
      userId: userId as any,
      friendIds: friendIds.slice(0, 3),
    });

    return new Response(JSON.stringify(compare), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

export default http;
