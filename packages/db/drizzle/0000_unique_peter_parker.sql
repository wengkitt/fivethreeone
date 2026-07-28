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
CREATE TABLE `block` (
	`id` text PRIMARY KEY NOT NULL,
	`lifter_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`squat_weight` real NOT NULL,
	`squat_reps` integer NOT NULL,
	`bench_press_weight` real NOT NULL,
	`bench_press_reps` integer NOT NULL,
	`deadlift_weight` real NOT NULL,
	`deadlift_reps` integer NOT NULL,
	`overhead_press_weight` real NOT NULL,
	`overhead_press_reps` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lifter_id`) REFERENCES `lifter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `block_lifter_id_idx` ON `block` (`lifter_id`);--> statement-breakpoint
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
CREATE TABLE `workout_day` (
	`id` text PRIMARY KEY NOT NULL,
	`block_id` text NOT NULL,
	`lift` text NOT NULL,
	`cycle_number` integer NOT NULL,
	`week_number` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_day_block_id_idx` ON `workout_day` (`block_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_day_block_lift_cycle_week` ON `workout_day` (`block_id`,`lift`,`cycle_number`,`week_number`);