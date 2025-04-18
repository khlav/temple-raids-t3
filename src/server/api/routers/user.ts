import {z} from "zod";
import {adminProcedure, createTRPCRouter} from "~/server/api/trpc";
import {users} from "~/server/db/schema";
import {asc, eq, sql} from "drizzle-orm";

export const user = createTRPCRouter({
  getUsers: adminProcedure.query(async ({ctx}) => {
    return await ctx.db.query.users.findMany({
      orderBy: asc(sql`lower
          (${users.name})`),
      columns: {
        id: true,
        name: true,
        image: true,
        isRaidManager: true,
        isAdmin: true,
      },
    });
  }),

  updateUserRole: adminProcedure
    .input(z.object({
      id: z.string(),
      isRaidManager: z.boolean(),
      isAdmin: z.boolean()
    }))
    .mutation(async ({ctx, input}) => {
      // 1 - Remove all existing associations to the target primary
      return await ctx.db
        .update(users)
        .set({
          isRaidManager: input.isRaidManager,
          isAdmin: input.isAdmin,
        })
        .where(eq(users.id, input.id))
        .returning({
          id: users.id,
          isRaidManager: users.isRaidManager,
          isAdmin: users.isAdmin
        });
    }),

});
