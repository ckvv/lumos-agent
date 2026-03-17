CREATE TABLE `conversation_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`conversation_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`role` text NOT NULL,
	`message_json` text NOT NULL,
	`runtime_snapshot_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_conversation_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`runtime_config_json` text NOT NULL,
	`last_message_preview` text,
	`last_message_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `provider_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`provider_id` text NOT NULL,
	`display_name` text NOT NULL,
	`kind` text NOT NULL,
	`auth_mode` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`base_url` text,
	`encrypted_secret` text,
	`compat_json` text,
	`secret_storage_mode` text NOT NULL,
	`last_sync_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`provider_config_id` integer NOT NULL,
	`model_id` text NOT NULL,
	`name` text NOT NULL,
	`api` text NOT NULL,
	`reasoning` integer DEFAULT false NOT NULL,
	`input_json` text NOT NULL,
	`context_window` integer NOT NULL,
	`max_tokens` integer NOT NULL,
	`cost_json` text NOT NULL,
	`origin` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_provider_models_provider_config_id_provider_configs_id_fk` FOREIGN KEY (`provider_config_id`) REFERENCES `provider_configs`(`id`) ON DELETE CASCADE
);
