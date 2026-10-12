CREATE TABLE "adrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date NOT NULL,
	"drug" text NOT NULL,
	"drug_start_date" date,
	"reaction" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"seriousness" text,
	"naranjo_answers" jsonb,
	"naranjo_score" smallint,
	"management" text[] DEFAULT '{}'::text[] NOT NULL,
	"management_note" text,
	"result" text,
	"actions" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "adrs_cancel_consistent" CHECK (("adrs"."cancelled_at" is null and "adrs"."cancelled_by" is null and "adrs"."cancel_reason" is null)
     or ("adrs"."cancelled_at" is not null and "adrs"."cancelled_by" is not null and nullif(btrim("adrs"."cancel_reason"), '') is not null)),
	CONSTRAINT "adrs_type" CHECK ("adrs"."type" in ('allergy', 'side_effect', 'pseudoallergy')),
	CONSTRAINT "adrs_severity" CHECK ("adrs"."severity" in ('mild', 'moderate', 'severe')),
	CONSTRAINT "adrs_seriousness" CHECK ("adrs"."seriousness" in ('not_serious', 'hospitalization', 'life_threatening', 'disability', 'death')),
	CONSTRAINT "adrs_management" CHECK ("adrs"."management" <@ array['stop_drug', 'reduce_dose', 'symptomatic_treatment', 'refer']::text[]),
	CONSTRAINT "adrs_result" CHECK ("adrs"."result" in ('recovered', 'improving', 'not_recovered', 'recovered_with_sequelae')),
	CONSTRAINT "adrs_actions" CHECK ("adrs"."actions" <@ array['allergy_card', 'his_record', 'hpvc_report', 'avoidance_advice']::text[]),
	CONSTRAINT "adrs_naranjo" CHECK (("adrs"."naranjo_answers" is null and "adrs"."naranjo_score" is null)
       or (jsonb_typeof("adrs"."naranjo_answers") = 'array' and jsonb_array_length("adrs"."naranjo_answers") = 10
           and "adrs"."naranjo_score" between -4 and 13)),
	CONSTRAINT "adrs_start_before_onset" CHECK ("adrs"."drug_start_date" is null or "adrs"."drug_start_date" <= "adrs"."date")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"patient_id" uuid,
	"action" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"diff" jsonb NOT NULL,
	CONSTRAINT "audit_log_action" CHECK ("audit_log"."action" in ('insert', 'update', 'cancel'))
);
--> statement-breakpoint
CREATE TABLE "drps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date NOT NULL,
	"drug" text,
	"category" text NOT NULL,
	"ncc_merp" text,
	"detail" text NOT NULL,
	"interventions" text[] NOT NULL,
	"recommendation" text,
	"acceptance" text NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"outcome_date" date,
	"follow_up_note" text,
	CONSTRAINT "drps_cancel_consistent" CHECK (("drps"."cancelled_at" is null and "drps"."cancelled_by" is null and "drps"."cancel_reason" is null)
     or ("drps"."cancelled_at" is not null and "drps"."cancelled_by" is not null and nullif(btrim("drps"."cancel_reason"), '') is not null)),
	CONSTRAINT "drps_category" CHECK ("drps"."category" in ('unnecessary_drug', 'needs_drug', 'ineffective_drug', 'dose_too_low', 'adverse_reaction', 'dose_too_high', 'nonadherence', 'interaction')),
	CONSTRAINT "drps_ncc_merp" CHECK ("drps"."ncc_merp" in ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')),
	CONSTRAINT "drps_interventions" CHECK (cardinality("drps"."interventions") > 0 and "drps"."interventions" <@ array['adjust_dose', 'add_drug', 'stop_or_switch', 'counsel', 'technique', 'administration', 'lab_monitoring', 'refer']::text[]),
	CONSTRAINT "drps_acceptance" CHECK ("drps"."acceptance" in ('not_needed', 'pending', 'accepted', 'partial', 'rejected')),
	CONSTRAINT "drps_outcome" CHECK ("drps"."outcome" in ('pending', 'resolved', 'partial', 'unresolved'))
);
--> statement-breakpoint
CREATE TABLE "high_alert_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date NOT NULL,
	"drug" text NOT NULL,
	"drug_other" text,
	"indication" text,
	"parameter" text NOT NULL,
	"value" numeric(8, 2) NOT NULL,
	"target_low" numeric(8, 2) NOT NULL,
	"target_high" numeric(8, 2) NOT NULL,
	"dose" text,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"factors" text[] DEFAULT '{}'::text[] NOT NULL,
	"action" text NOT NULL,
	"plan" text,
	CONSTRAINT "high_alert_monitoring_cancel_consistent" CHECK (("high_alert_monitoring"."cancelled_at" is null and "high_alert_monitoring"."cancelled_by" is null and "high_alert_monitoring"."cancel_reason" is null)
     or ("high_alert_monitoring"."cancelled_at" is not null and "high_alert_monitoring"."cancelled_by" is not null and nullif(btrim("high_alert_monitoring"."cancel_reason"), '') is not null)),
	CONSTRAINT "high_alert_drug" CHECK ("high_alert_monitoring"."drug" in ('warfarin', 'doac', 'insulin', 'methotrexate', 'digoxin', 'lithium', 'phenytoin', 'amiodarone', 'oral_chemo', 'other')),
	CONSTRAINT "high_alert_value" CHECK ("high_alert_monitoring"."value" between 0 and 5000),
	CONSTRAINT "high_alert_target" CHECK ("high_alert_monitoring"."target_low" < "high_alert_monitoring"."target_high"),
	CONSTRAINT "high_alert_events" CHECK ("high_alert_monitoring"."events" <@ array['minor_bleed', 'major_bleed', 'thrombosis', 'toxicity']::text[]),
	CONSTRAINT "high_alert_factors" CHECK ("high_alert_monitoring"."factors" <@ array['missed_or_wrong_dose', 'drug_interaction', 'herbal_supplement', 'diet_change', 'acute_illness', 'alcohol']::text[]),
	CONSTRAINT "high_alert_action" CHECK ("high_alert_monitoring"."action" in ('maintain', 'increase', 'decrease', 'hold', 'refer_now'))
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"hn" text NOT NULL,
	"prefix" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"sex" text,
	"birth_date" date,
	"birth_date_estimated" boolean DEFAULT false NOT NULL,
	"his_synced_at" timestamp with time zone,
	"weight_kg" numeric(4, 1),
	"main_clinic_code" text,
	"main_clinic_name" text,
	"conditions" text[] DEFAULT '{}'::text[] NOT NULL,
	"allergy_summary" text,
	"goal_a1c" numeric(3, 1) DEFAULT 7 NOT NULL,
	"goal_sbp" smallint DEFAULT 140 NOT NULL,
	"goal_dbp" smallint DEFAULT 90 NOT NULL,
	"goal_ldl" smallint DEFAULT 100 NOT NULL,
	"note" text,
	CONSTRAINT "patients_cancel_consistent" CHECK (("patients"."cancelled_at" is null and "patients"."cancelled_by" is null and "patients"."cancel_reason" is null)
     or ("patients"."cancelled_at" is not null and "patients"."cancelled_by" is not null and nullif(btrim("patients"."cancel_reason"), '') is not null)),
	CONSTRAINT "patients_sex" CHECK ("patients"."sex" in ('male', 'female')),
	CONSTRAINT "patients_weight" CHECK ("patients"."weight_kg" between 2 and 300),
	CONSTRAINT "patients_goal_a1c" CHECK ("patients"."goal_a1c" between 5 and 10),
	CONSTRAINT "patients_goal_sbp" CHECK ("patients"."goal_sbp" between 100 and 180),
	CONSTRAINT "patients_goal_dbp" CHECK ("patients"."goal_dbp" between 60 and 110),
	CONSTRAINT "patients_goal_ldl" CHECK ("patients"."goal_ldl" between 40 and 190)
);
--> statement-breakpoint
CREATE TABLE "technique_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date NOT NULL,
	"device" text NOT NULL,
	"drug" text NOT NULL,
	"phase" text NOT NULL,
	"drug_user" text,
	"steps" jsonb NOT NULL,
	"score_pct" smallint NOT NULL,
	"critical_all_passed" boolean NOT NULL,
	"education" text[] DEFAULT '{}'::text[] NOT NULL,
	"problem" text,
	"advice" text,
	"aids" text,
	CONSTRAINT "technique_assessments_cancel_consistent" CHECK (("technique_assessments"."cancelled_at" is null and "technique_assessments"."cancelled_by" is null and "technique_assessments"."cancel_reason" is null)
     or ("technique_assessments"."cancelled_at" is not null and "technique_assessments"."cancelled_by" is not null and nullif(btrim("technique_assessments"."cancel_reason"), '') is not null)),
	CONSTRAINT "technique_device" CHECK ("technique_assessments"."device" in ('pen', 'syringe', 'mdi', 'spacer', 'accuhaler', 'turbuhaler', 'respimat', 'nasal')),
	CONSTRAINT "technique_phase" CHECK ("technique_assessments"."phase" in ('pre', 'post', 'follow_up')),
	CONSTRAINT "technique_drug_user" CHECK ("technique_assessments"."drug_user" in ('self', 'caregiver')),
	CONSTRAINT "technique_steps" CHECK (jsonb_typeof("technique_assessments"."steps") = 'array' and jsonb_array_length("technique_assessments"."steps") > 0),
	CONSTRAINT "technique_score" CHECK ("technique_assessments"."score_pct" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid DEFAULT nullif(current_setting('app.user_id', true), '')::uuid NOT NULL,
	"created_by_name" text DEFAULT nullif(current_setting('app.user_name', true), '') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clinic_code" text,
	"clinic_name" text,
	"sbp" smallint,
	"dbp" smallint,
	"fbs" smallint,
	"a1c" numeric(3, 1),
	"ldl" smallint,
	"scr" numeric(4, 2),
	"adherence_pct" smallint,
	"adherence_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"med_rec" jsonb NOT NULL,
	"soap_s" text,
	"soap_o" text,
	"soap_a" text,
	"soap_p" text,
	CONSTRAINT "visits_cancel_consistent" CHECK (("visits"."cancelled_at" is null and "visits"."cancelled_by" is null and "visits"."cancel_reason" is null)
     or ("visits"."cancelled_at" is not null and "visits"."cancelled_by" is not null and nullif(btrim("visits"."cancel_reason"), '') is not null)),
	CONSTRAINT "visits_med_rec" CHECK (jsonb_typeof("visits"."med_rec") = 'array' and jsonb_array_length("visits"."med_rec") > 0),
	CONSTRAINT "visits_adherence_methods" CHECK ("visits"."adherence_methods" <@ array['pill_count', 'interview', 'leftover_check', 'mmas8']::text[]),
	CONSTRAINT "visits_sbp" CHECK ("visits"."sbp" between 50 and 300),
	CONSTRAINT "visits_dbp" CHECK ("visits"."dbp" between 30 and 200),
	CONSTRAINT "visits_fbs" CHECK ("visits"."fbs" between 20 and 800),
	CONSTRAINT "visits_a1c" CHECK ("visits"."a1c" between 3 and 20),
	CONSTRAINT "visits_ldl" CHECK ("visits"."ldl" between 10 and 500),
	CONSTRAINT "visits_scr" CHECK ("visits"."scr" between 0.1 and 20),
	CONSTRAINT "visits_adherence" CHECK ("visits"."adherence_pct" between 0 and 120)
);
--> statement-breakpoint
ALTER TABLE "adrs" ADD CONSTRAINT "adrs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drps" ADD CONSTRAINT "drps_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_alert_monitoring" ADD CONSTRAINT "high_alert_monitoring_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technique_assessments" ADD CONSTRAINT "technique_assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adrs_patient_date_idx" ON "adrs" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "audit_log_patient_idx" ON "audit_log" USING btree ("patient_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_record_idx" ON "audit_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "drps_patient_date_idx" ON "drps" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "drps_open_idx" ON "drps" USING btree ("outcome") WHERE "drps"."cancelled_at" is null and "drps"."outcome" = 'pending';--> statement-breakpoint
CREATE INDEX "high_alert_patient_date_idx" ON "high_alert_monitoring" USING btree ("patient_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_hn_active_uq" ON "patients" USING btree ("hn") WHERE "patients"."cancelled_at" is null;--> statement-breakpoint
CREATE INDEX "technique_patient_date_idx" ON "technique_assessments" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "visits_patient_date_idx" ON "visits" USING btree ("patient_id","date");