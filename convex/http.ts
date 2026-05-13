import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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

    const summary = await ctx.runMutation(api.ratings.submitRating, { locationId, sessionId, rating });

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

    const summary = await ctx.runQuery(api.ratings.getSummary, {
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
    const rows = await ctx.runQuery(api.locations.listLocations, {});
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

    await ctx.runMutation(api.locations.upsertLocation, { location });

    const rows = await ctx.runQuery(api.locations.listLocations, {});
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

    await ctx.runMutation(api.locations.deleteLocation, { id });

    const rows = await ctx.runQuery(api.locations.listLocations, {});
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

    const allLocations = await ctx.runQuery(api.locations.listLocations, {});
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
      const result = await ctx.runAction(api.auth.signup, {
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
      const result = await ctx.runAction(api.auth.login, {
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
      const result = await ctx.runMutation(api.ratings.submitUserRating, {
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

    const ratings = await ctx.runQuery(api.ratings.getUserRatings, { locationId });
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
      const result = await ctx.runMutation(api.ratings.deleteUserRating, {
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
      const result = await ctx.runMutation(api.ratings.toggleFavorite, {
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

    const isFav = await ctx.runQuery(api.ratings.isFavorite, {
      locationId,
      userId,
    });
    return new Response(JSON.stringify({ locationId, userId, isFavorite: isFav }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

export default http;
