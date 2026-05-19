import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function sortIds(left: string, right: string) {
  return left < right ? [left, right] as const : [right, left] as const;
}

async function getUserByEmail(ctx: any, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase()))
    .unique();
}

async function getFriendIds(ctx: any, userId: string) {
  const rows = await ctx.db
    .query("friendships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  return rows.map((row: any) => row.friendUserId);
}

async function getLocationsByIds(ctx: any, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const rows = await ctx.db.query("curatedLocations").collect();
  const wanted = new Set(ids);
  return rows.filter((row: any) => wanted.has(row.id));
}

export const getFriendRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const incoming = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiver_status", (q) => q.eq("receiverId", args.userId).eq("status", "pending"))
      .collect();

    const outgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_sender_status", (q) => q.eq("senderId", args.userId).eq("status", "pending"))
      .collect();

    return { incoming, outgoing };
  },
});

export const sendFriendRequestByEmail = mutation({
  args: { senderId: v.id("users"), receiverEmail: v.string() },
  handler: async (ctx, args) => {
    const receiver = await getUserByEmail(ctx, args.receiverEmail);
    if (!receiver) {
      throw new Error("No user found with that email");
    }
    if (receiver._id === args.senderId) {
      throw new Error("You cannot add yourself as a friend");
    }

    const [lowId, highId] = sortIds(String(args.senderId), String(receiver._id));
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", lowId).eq("friendUserId", highId))
      .unique();
    if (existingFriendship) {
      throw new Error("You are already friends");
    }

    const pending = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) => q.eq("senderId", args.senderId).eq("receiverId", receiver._id))
      .unique();
    if (pending) {
      throw new Error("Friend request already sent");
    }

    const now = Date.now();
    await ctx.db.insert("friendRequests", {
      senderId: args.senderId,
      receiverId: receiver._id,
      senderEmail: (await ctx.db.get(args.senderId))?.email || "",
      receiverEmail: receiver.email,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const respondToFriendRequest = mutation({
  args: { requestId: v.id("friendRequests"), userId: v.id("users"), action: v.union(v.literal("accept"), v.literal("decline")) },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.receiverId !== args.userId) {
      throw new Error("Friend request not found");
    }

    const now = Date.now();
    if (args.action === "accept") {
      const [leftId, rightId] = sortIds(String(request.senderId), String(request.receiverId));
      const existing = await ctx.db
        .query("friendships")
        .withIndex("by_user_friend", (q) => q.eq("userId", leftId).eq("friendUserId", rightId))
        .unique();
      if (!existing) {
        await ctx.db.insert("friendships", { userId: leftId as any, friendUserId: rightId as any, createdAt: now });
        await ctx.db.insert("friendships", { userId: rightId as any, friendUserId: leftId as any, createdAt: now });
      }
    }

    await ctx.db.patch(request._id, {
      status: args.action === "accept" ? "accepted" : "declined",
      updatedAt: now,
    });

    if (args.action === "decline") {
      await ctx.db.delete(request._id);
    }

    return { ok: true };
  },
});

export const getFriends = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const friendIds = await getFriendIds(ctx, String(args.userId));
    const friends = await Promise.all(friendIds.map(async (friendId) => {
      const user = await ctx.db.get(friendId as any);
      return user ? { _id: user._id, email: user.email, name: user.name, createdAt: user.createdAt } : null;
    }));
    return friends.filter(Boolean);
  },
});

export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const favorites = await ctx.db
      .query("userFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const ratings = await ctx.db
      .query("userRatings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const [favoriteLocations, ratingsLocations, friends, requests] = await Promise.all([
      getLocationsByIds(ctx, favorites.map((row) => row.locationId)),
      getLocationsByIds(ctx, ratings.map((row) => row.locationId)),
      getFriendIds(ctx, String(args.userId)).then(async (friendIds) => {
        const users = await Promise.all(friendIds.map((friendId) => ctx.db.get(friendId as any)));
        return users.filter(Boolean).map((user: any) => ({
          _id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        }));
      }),
      Promise.resolve(await (async () => {
        const incoming = await ctx.db
          .query("friendRequests")
          .withIndex("by_receiver_status", (q) => q.eq("receiverId", args.userId).eq("status", "pending"))
          .collect();

        const outgoing = await ctx.db
          .query("friendRequests")
          .withIndex("by_sender_status", (q) => q.eq("senderId", args.userId).eq("status", "pending"))
          .collect();

        return { incoming, outgoing };
      })()),
    ]);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      favorites,
      favoriteLocations,
      ratings,
      ratingsLocations,
      friends,
      requests,
    };
  },
});

export const compareFavorites = query({
  args: { userId: v.id("users"), friendIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const ids = [String(args.userId), ...args.friendIds.map((id) => String(id))];
    const rows = await Promise.all(ids.map(async (userId) => {
      const favorites = await ctx.db
        .query("userFavorites")
        .withIndex("by_user", (q) => q.eq("userId", userId as any))
        .collect();
      return { userId, locationIds: favorites.map((row) => row.locationId) };
    }));

    const sharedAll = rows.length > 0
      ? rows.reduce((acc, row) => acc.filter((id) => row.locationIds.includes(id)))
      : [];

    const perFriend = args.friendIds.map((friendId) => {
      const friendRow = rows.find((row) => row.userId === String(friendId));
      const userRow = rows.find((row) => row.userId === String(args.userId));
      const shared = userRow && friendRow
        ? userRow.locationIds.filter((id) => friendRow.locationIds.includes(id))
        : [];
      return { friendId, sharedLocationIds: shared };
    });

    const sharedLocations = await getLocationsByIds(ctx, sharedAll);

    return { rows, sharedAll, perFriend, sharedLocations };
  },
});