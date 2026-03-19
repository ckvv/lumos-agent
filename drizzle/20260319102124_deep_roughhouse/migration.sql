CREATE TABLE `builtin_tools` (
	`name` text PRIMARY KEY,
	`is_enabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
