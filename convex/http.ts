import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

export default http;
