CREATE TABLE `managed_skills` (
	`id` text PRIMARY KEY,
	`file_path` text NOT NULL,
	`skill_name` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`display_name` text NOT NULL,
	`transport` text NOT NULL,
	`config_json` text NOT NULL,
	`encrypted_secret` text,
	`secret_storage_mode` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`last_checked_at` text,
	`last_error` text,
	`last_snapshot_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `invocation_metadata_json` text;