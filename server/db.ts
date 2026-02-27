import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  profiles,
  workoutPlans,
  workoutLogs,
  progressLogs,
  aiGenerations,
  dietPlans,
  type Profile,
  type InsertProfile,
  type WorkoutPlan,
  type InsertWorkoutPlan,
  type InsertWorkoutLog,
  type InsertProgressLog,
  type InsertAiGeneration,
  type InsertDietPlan,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Profile queries
 */
export async function getProfileByUserId(userId: number): Promise<Profile | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertProfile(profile: InsertProfile): Promise<Profile | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    await db.insert(profiles).values(profile).onDuplicateKeyUpdate({
      set: {
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        goal: profile.goal,
        experienceLevel: profile.experienceLevel,
        daysPerWeek: profile.daysPerWeek,
        equipmentAccess: profile.equipmentAccess,
        onboardingCompleted: profile.onboardingCompleted,
        updatedAt: new Date(),
      },
    });
    return getProfileByUserId(profile.userId);
  } catch (error) {
    console.error("[Database] Failed to upsert profile:", error);
    throw error;
  }
}

/**
 * Workout plan queries
 */
export async function getActiveWorkoutPlan(userId: number): Promise<WorkoutPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.insert(workoutPlans).values(plan);
    const planId = result[0].insertId;
    const created = await db.select().from(workoutPlans).where(eq(workoutPlans.id, planId as number)).limit(1);
    return created.length > 0 ? created[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create workout plan:", error);
    throw error;
  }
}

/**
 * Workout log queries
 */
export async function createWorkoutLog(log: InsertWorkoutLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(workoutLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create workout log:", error);
    throw error;
  }
}

export async function getWorkoutLogsByUserId(userId: number, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .orderBy(workoutLogs.createdAt)
    .limit(limit);

  return result;
}

/**
 * Progress log queries
 */
export async function createProgressLog(log: InsertProgressLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(progressLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create progress log:", error);
    throw error;
  }
}

export async function getProgressLogsByUserId(userId: number, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(progressLogs.loggedAt)
    .limit(limit);

  return result;
}

/**
 * AI generation tracking
 */
export async function trackAiGeneration(generation: InsertAiGeneration): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(aiGenerations).values(generation);
  } catch (error) {
    console.error("[Database] Failed to track AI generation:", error);
    throw error;
  }
}

export async function getAiGenerationCount(userId: number, type?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(aiGenerations.userId, userId)];
  if (type) {
    conditions.push(eq(aiGenerations.type, type));
  }

  const result = await db.select().from(aiGenerations).where(and(...conditions));
  return result.length;
}

/**
 * Diet plan queries
 */
export async function createDietPlan(plan: InsertDietPlan): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(dietPlans).values(plan);
  } catch (error) {
    console.error("[Database] Failed to create diet plan:", error);
    throw error;
  }
}

export async function getLatestDietPlan(userId: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(dietPlans)
    .where(eq(dietPlans.userId, userId))
    .orderBy(dietPlans.createdAt)
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * User analytics queries
 */
export async function getAllUsers(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users);
}

export async function getUserById(userId: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
