CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assistance_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight` real,
	`notes` text,
	`template_name` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistance_exercise_workout_id_idx` ON `assistance_exercise` (`workout_id`);--> statement-breakpoint
CREATE TABLE `assistance_template` (
	`id` text PRIMARY KEY NOT NULL,
	`lifter_id` text NOT NULL,
	`name` text NOT NULL,
	`exercises` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lifter_id`) REFERENCES `lifter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistance_template_lifter_id_idx` ON `assistance_template` (`lifter_id`);--> statement-breakpoint
CREATE TABLE `lifter` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`plate_increment` integer DEFAULT 2500 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lifter_user_id_unique` ON `lifter` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lifter_username_unique` ON `lifter` (`username`);--> statement-breakpoint
CREATE TABLE `personal_record` (
	`id` text PRIMARY KEY NOT NULL,
	`lifter_id` text NOT NULL,
	`lift` text NOT NULL,
	`pr_type` text NOT NULL,
	`value` real NOT NULL,
	`achieved_at` integer NOT NULL,
	`workout_id` text,
	FOREIGN KEY (`lifter_id`) REFERENCES `lifter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `personal_record_lifter_id_idx` ON `personal_record` (`lifter_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `training_max` (
	`id` text PRIMARY KEY NOT NULL,
	`lifter_id` text NOT NULL,
	`lift` text NOT NULL,
	`one_rm` real NOT NULL,
	`training_max` real NOT NULL,
	`cycle_number` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lifter_id`) REFERENCES `lifter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `training_max_lifter_id_idx` ON `training_max` (`lifter_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `training_max_lifter_lift` ON `training_max` (`lifter_id`,`lift`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`lifter_id` text NOT NULL,
	`lift` text NOT NULL,
	`week_number` integer NOT NULL,
	`cycle_number` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`notes` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lifter_id`) REFERENCES `lifter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_lifter_id_idx` ON `workout` (`lifter_id`);--> statement-breakpoint
CREATE TABLE `workout_set` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`target_percentage` real NOT NULL,
	`calculated_weight` real NOT NULL,
	`actual_weight` real,
	`target_reps` integer NOT NULL,
	`actual_reps` integer,
	`is_amrap` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_set_workout_id_idx` ON `workout_set` (`workout_id`);