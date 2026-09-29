import { query } from "./_generated/server";
import { assertAdmin } from "./adminGuards";

/** Roster for the admin console, newest members last. */
export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      name: u.name ?? null,
      email: u.email ?? null,
      role: u.role ?? null,
      isAnonymous: u.isAnonymous ?? false,
    }));
  },
});
