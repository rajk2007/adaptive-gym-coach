import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getProfileByUserId,
  upsertProfile,
  getActiveWorkoutPlan,
  createWorkoutPlan,
  createWorkoutLog,
  getWorkoutLogsByUserId,
  createProgressLog,
  getProgressLogsByUserId,
  trackAiGeneration,
  getAiGenerationCount,
  createDietPlan,
  getLatestDietPlan,
  getUserById,
} from "../db";
import {
  generateWorkoutPlan,
  generateWeeklyAdjustment,
  generateDietPlan,
} from "../ai";
import { notifyOwner } from "../_core/notification";

/**
 * Guard to check if user is Pro tier
 */
function requirePro(tier: string) {
  if (tier !== "pro") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires a Pro subscription",
    });
  }
}

/**
 * Guard to check generation limits for free users
 */
async function checkGenerationLimit(userId: number, tier: string) {
  if (tier === "free") {
    const count = await getAiGenerationCount(userId, "plan");
    if (count >= 1) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Free users can only generate 1 workout plan. Upgrade to Pro for unlimited plans.",
      });
    }
  }
}

export const fitnessRouter = router({
  /**
   * Get or create user profile
   */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    return profile || null;
  }),

  /**
   * Update user profile (onboarding)
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        age: z.number().min(13).max(120),
        gender: z.enum(["male", "female", "other"]),
        height: z.number().min(100).max(250), // in cm
        weight: z.number().min(30).max(300), // in kg
        goal: z.enum(["muscle_gain", "fat_loss", "strength", "recomposition"]),
        experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
        daysPerWeek: z.number().min(1).max(7),
        equipmentAccess: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await upsertProfile({
        userId: ctx.user.id,
        age: input.age,
        gender: input.gender,
        height: input.height as any,
        weight: input.weight as any,
        goal: input.goal,
        experienceLevel: input.experienceLevel,
        daysPerWeek: input.daysPerWeek,
        equipmentAccess: JSON.stringify(input.equipmentAccess),
        onboardingCompleted: false,
      });

      return profile;
    }),

  /**
   * Generate initial workout plan (triggers on onboarding completion)
   */
  generateInitialPlan: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check generation limits
    await checkGenerationLimit(ctx.user.id, user.subscriptionTier);

    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Complete profile first",
      });
    }

    try {
      // Call AI to generate plan
      const aiResult = await generateWorkoutPlan({
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        goal: profile.goal,
        experienceLevel: profile.experienceLevel,
        daysPerWeek: profile.daysPerWeek,
        equipmentAccess: profile.equipmentAccess,
      });

      if (!aiResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI generation failed: ${aiResult.error}`,
        });
      }

      // Save plan to database
      const plan = await createWorkoutPlan({
        userId: ctx.user.id,
        title: `${profile.goal} - Week 1`,
        weeklySplit: aiResult.data.weekly_split,
        planJson: aiResult.data,
        isActive: true,
      });

      // Track generation
      await trackAiGeneration({
        userId: ctx.user.id,
        type: "plan",
        status: "success",
      });

      // Mark onboarding as complete
      await upsertProfile({
        userId: ctx.user.id,
        onboardingCompleted: true,
      });

      // Notify owner
      await notifyOwner({
        title: "New User Onboarding Complete",
        content: `User ${user.email} completed onboarding and generated their first workout plan. Goal: ${profile.goal}`,
      });

      return plan;
    } catch (error) {
      await trackAiGeneration({
        userId: ctx.user.id,
        type: "plan",
        status: "failed",
      });
      throw error;
    }
  }),

  /**
   * Get active workout plan
   */
  getActivePlan: protectedProcedure.query(async ({ ctx }) => {
    const plan = await getActiveWorkoutPlan(ctx.user.id);
    return plan || null;
  }),

  /**
   * Log a workout
   */
  logWorkout: protectedProcedure
    .input(
      z.object({
        workoutDay: z.string(),
        exerciseName: z.string(),
        weight: z.number().optional(),
        reps: z.number().optional(),
        sets: z.number().optional(),
        rpe: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createWorkoutLog({
        userId: ctx.user.id,
        workoutDay: input.workoutDay,
        exerciseName: input.exerciseName,
        weight: input.weight as any,
        reps: input.reps,
        sets: input.sets,
        rpe: input.rpe,
        notes: input.notes,
        completedAt: new Date(),
      });

      return { success: true };
    }),

  /**
   * Get workout history
   */
  getWorkoutHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return getWorkoutLogsByUserId(ctx.user.id, input.limit);
    }),

  /**
   * Log progress (body weight, body fat, etc.)
   */
  logProgress: protectedProcedure
    .input(
      z.object({
        bodyWeight: z.number().optional(),
        bodyFatPercentage: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createProgressLog({
        userId: ctx.user.id,
        bodyWeight: input.bodyWeight as any,
        bodyFatPercentage: input.bodyFatPercentage as any,
        notes: input.notes,
      });

      return { success: true };
    }),

  /**
   * Get progress history
   */
  getProgressHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return getProgressLogsByUserId(ctx.user.id, input.limit);
    }),

  /**
   * Generate weekly adjustment (Pro only)
   */
  generateWeeklyAdjustment: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    requirePro(user.subscriptionTier);

    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Profile not found" });
    }

    const currentPlan = await getActiveWorkoutPlan(ctx.user.id);
    if (!currentPlan) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active workout plan",
      });
    }

    const workoutLogs = await getWorkoutLogsByUserId(ctx.user.id, 50);

    try {
      const aiResult = await generateWeeklyAdjustment(
        {
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          goal: profile.goal,
          experienceLevel: profile.experienceLevel,
          daysPerWeek: profile.daysPerWeek,
        },
        workoutLogs,
        currentPlan.planJson
      );

      if (!aiResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI adjustment failed: ${aiResult.error}`,
        });
      }

      await trackAiGeneration({
        userId: ctx.user.id,
        type: "adjustment",
        status: "success",
      });

      return aiResult.data;
    } catch (error) {
      await trackAiGeneration({
        userId: ctx.user.id,
        type: "adjustment",
        status: "failed",
      });
      throw error;
    }
  }),

  /**
   * Generate diet plan (Pro only)
   */
  generateDiet: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    requirePro(user.subscriptionTier);

    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Profile not found" });
    }

    try {
      const aiResult = await generateDietPlan({
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight,
        goal: profile.goal,
        experienceLevel: profile.experienceLevel,
        daysPerWeek: profile.daysPerWeek,
      });

      if (!aiResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Diet generation failed: ${aiResult.error}`,
        });
      }

      await createDietPlan({
        userId: ctx.user.id,
        calories: Number(aiResult.data.calories),
        proteinGrams: aiResult.data.protein_grams as any,
        carbsGrams: aiResult.data.carbs_grams as any,
        fatGrams: aiResult.data.fat_grams as any,
        sampleMeals: aiResult.data.sample_meals,
        planJson: aiResult.data,
      });

      await trackAiGeneration({
        userId: ctx.user.id,
        type: "diet",
        status: "success",
      });

      return aiResult.data;
    } catch (error) {
      await trackAiGeneration({
        userId: ctx.user.id,
        type: "diet",
        status: "failed",
      });
      throw error;
    }
  }),

  /**
   * Get latest diet plan
   */
  getLatestDiet: protectedProcedure.query(async ({ ctx }) => {
    const diet = await getLatestDietPlan(ctx.user.id);
    return diet || null;
  }),
});
