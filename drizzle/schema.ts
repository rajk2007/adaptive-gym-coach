import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro"]).default("free").notNull(),
  aiGenerationCount: int("aiGenerationCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User fitness profile - stores body measurements and fitness preferences
 */
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  age: int("age"),
  gender: varchar("gender", { length: 20 }),
  height: decimal("height", { precision: 5, scale: 2 }), // in cm
  weight: decimal("weight", { precision: 5, scale: 2 }), // in kg
  goal: varchar("goal", { length: 50 }), // muscle_gain, fat_loss, strength, recomposition
  experienceLevel: varchar("experienceLevel", { length: 20 }), // beginner, intermediate, advanced
  daysPerWeek: int("daysPerWeek"),
  equipmentAccess: text("equipmentAccess"), // JSON array of equipment
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * Workout plans - stores AI-generated workout routines
 */
export const workoutPlans = mysqlTable("workoutPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  weeklySplit: varchar("weeklySplit", { length: 100 }), // e.g., "Upper/Lower"
  planJson: json("planJson"), // Full AI-generated plan structure
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = typeof workoutPlans.$inferInsert;

/**
 * Workout logs - tracks individual workout sessions
 */
export const workoutLogs = mysqlTable("workoutLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutDay: varchar("workoutDay", { length: 50 }),
  exerciseName: varchar("exerciseName", { length: 255 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  reps: int("reps"),
  sets: int("sets"),
  rpe: int("rpe"), // Rate of Perceived Exertion (1-10)
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = typeof workoutLogs.$inferInsert;

/**
 * Progress logs - tracks body measurements and progress notes
 */
export const progressLogs = mysqlTable("progressLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bodyWeight: decimal("bodyWeight", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("bodyFatPercentage", { precision: 5, scale: 2 }),
  notes: text("notes"),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgressLog = typeof progressLogs.$inferSelect;
export type InsertProgressLog = typeof progressLogs.$inferInsert;

/**
 * AI generations - tracks AI API usage for cost control
 */
export const aiGenerations = mysqlTable("aiGenerations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // plan, adjustment, diet
  status: varchar("status", { length: 50 }).default("success"), // success, failed, retry
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiGeneration = typeof aiGenerations.$inferSelect;
export type InsertAiGeneration = typeof aiGenerations.$inferInsert;

/**
 * Diet plans - stores AI-generated nutrition recommendations
 */
export const dietPlans = mysqlTable("dietPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  calories: int("calories"),
  proteinGrams: decimal("proteinGrams", { precision: 5, scale: 1 }),
  carbsGrams: decimal("carbsGrams", { precision: 5, scale: 1 }),
  fatGrams: decimal("fatGrams", { precision: 5, scale: 1 }),
  sampleMeals: json("sampleMeals"), // Array of meal suggestions
  planJson: json("planJson"), // Full plan details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DietPlan = typeof dietPlans.$inferSelect;
export type InsertDietPlan = typeof dietPlans.$inferInsert;

/**
 * Relations for type safety
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  workoutPlans: many(workoutPlans),
  workoutLogs: many(workoutLogs),
  progressLogs: many(progressLogs),
  aiGenerations: many(aiGenerations),
  dietPlans: many(dietPlans),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one }) => ({
  user: one(users, {
    fields: [workoutPlans.userId],
    references: [users.id],
  }),
}));

export const workoutLogsRelations = relations(workoutLogs, ({ one }) => ({
  user: one(users, {
    fields: [workoutLogs.userId],
    references: [users.id],
  }),
}));

export const progressLogsRelations = relations(progressLogs, ({ one }) => ({
  user: one(users, {
    fields: [progressLogs.userId],
    references: [users.id],
  }),
}));

export const aiGenerationsRelations = relations(aiGenerations, ({ one }) => ({
  user: one(users, {
    fields: [aiGenerations.userId],
    references: [users.id],
  }),
}));

export const dietPlansRelations = relations(dietPlans, ({ one }) => ({
  user: one(users, {
    fields: [dietPlans.userId],
    references: [users.id],
  }),
}));