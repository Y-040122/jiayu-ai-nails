CREATE TABLE `ai_quota` (
	`id` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL
);
