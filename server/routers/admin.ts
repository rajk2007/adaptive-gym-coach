import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getAllUsers, getUserById, getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Admin-only guard
 */
function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}

export const adminRouter = router({
  /**
   * Get all users (admin only)
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    return getAllUsers();
  }),

  /**
   * Get user details (admin only)
   */
  getUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return getUserById(input.userId);
    }),

  /**
   * Toggle user subscription tier (admin only)
   */
  toggleSubscription: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const user = await getUserById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const newTier = user.subscriptionTier === "free" ? "pro" : "free";

      try {
        await db
          .update(users)
          .set({
            subscriptionTier: newTier,
            updatedAt: new Date(),
          })
          .where(eq(users.id, input.userId));

        return {
          success: true,
          newTier,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update subscription",
        });
      }
    }),

  /**
   * Get analytics dashboard data (admin only)
   */
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const allUsers = await getAllUsers();

      const totalUsers = allUsers.length;
      const proUsers = allUsers.filter((u) => u.subscriptionTier === "pro").length;
      const freeUsers = totalUsers - proUsers;
      const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(2) : "0";

      const adminUsers = allUsers.filter((u) => u.role === "admin").length;

      // Calculate recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = allUsers.filter((u) => new Date(u.createdAt) > sevenDaysAgo).length;

      return {
        totalUsers,
        proUsers,
        freeUsers,
        conversionRate: `${conversionRate}%`,
        adminUsers,
        recentSignups,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch analytics",
      });
    }
  }),

  /**
   * Get system health status (admin only)
   */
  getSystemHealth: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);

    const db = await getDb();
    const isDbHealthy = db !== null;

    return {
      database: isDbHealthy ? "healthy" : "unhealthy",
      apiKey: process.env.OPENROUTER_API_KEY ? "configured" : "missing",
      timestamp: new Date(),
    };
  }),
});
