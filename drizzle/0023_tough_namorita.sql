ALTER TABLE "auth_user" ADD COLUMN "api_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "templar_enabled" boolean DEFAULT false NOT NULL;