CREATE TABLE `aiGenerations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`status` varchar(50) DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiGenerations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dietPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`calories` int,
	`proteinGrams` decimal(5,1),
	`carbsGrams` decimal(5,1),
	`fatGrams` decimal(5,1),
	`sampleMeals` json,
	`planJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dietPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`age` int,
	`gender` varchar(20),
	`height` decimal(5,2),
	`weight` decimal(5,2),
	`goal` varchar(50),
	`experienceLevel` varchar(20),
	`daysPerWeek` int,
	`equipmentAccess` text,
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `progressLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bodyWeight` decimal(5,2),
	`bodyFatPercentage` decimal(5,2),
	`notes` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progressLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workoutLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workoutDay` varchar(50),
	`exerciseName` varchar(255) NOT NULL,
	`weight` decimal(5,2),
	`reps` int,
	`sets` int,
	`rpe` int,
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workoutLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workoutPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`weeklySplit` varchar(100),
	`planJson` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workoutPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `aiGenerationCount` int DEFAULT 0 NOT NULL;