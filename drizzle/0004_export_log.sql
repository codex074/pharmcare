CREATE TABLE "export_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "export_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"table_name" text NOT NULL,
	"row_count" integer NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "export_log_at_idx" ON "export_log" USING btree ("at");