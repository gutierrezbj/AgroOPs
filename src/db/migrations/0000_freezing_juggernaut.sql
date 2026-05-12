CREATE TYPE "public"."client_type" AS ENUM('cooperativa', 'atria', 'agricultor', 'comunidad_regantes', 'empresa_agraria', 'otros');--> statement-breakpoint
CREATE TYPE "public"."drone_status" AS ENUM('active', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."drone_easa_class" AS ENUM('c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'n_a');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'piloto', 'operario', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."dose_unit" AS ENUM('l_per_ha', 'kg_per_ha', 'ml_per_ha', 'g_per_ha');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('draft', 'planned', 'approved', 'preflight', 'in_flight', 'completed', 'invoiced', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."mission_type" AS ENUM('aerial_application');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'issued', 'paid', 'cancelled', 'error');--> statement-breakpoint
CREATE TABLE "albarans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"code" text NOT NULL,
	"signed_at" timestamp with time zone,
	"signer_full_name" text,
	"signer_nif" text,
	"signature_image_base64" text,
	"pdf_path" text,
	"pdf_hash" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "albarans_mission_id_unique" UNIQUE("mission_id"),
	CONSTRAINT "albarans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tax_id" text NOT NULL,
	"type" "client_type" DEFAULT 'agricultor' NOT NULL,
	"contact_person" text,
	"contact_email" text,
	"contact_phone" text,
	"billing_address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"country" text DEFAULT 'ES' NOT NULL,
	"holded_contact_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "drones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"manufacturer" text DEFAULT 'DJI' NOT NULL,
	"serial_number" text NOT NULL,
	"registration_code" text,
	"mtom_grams" integer NOT NULL,
	"easa_class" "drone_easa_class" NOT NULL,
	"application_capable" boolean DEFAULT false NOT NULL,
	"payload_litres" numeric(5, 2),
	"insurance_policy_number" text,
	"insurance_expires_at" date,
	"flight_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"status" "drone_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drones_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pilots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"nif" text NOT NULL,
	"aesa_license_number" text,
	"aesa_license_class" text,
	"aesa_license_expires_at" date,
	"ropo_qualified" boolean DEFAULT false NOT NULL,
	"ropo_number" text,
	"ropo_level" text,
	"ropo_expires_at" date,
	"insurance_policy_number" text,
	"insurance_expires_at" date,
	"medical_certificate_expires_at" date,
	"flight_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilots_nif_unique" UNIQUE("nif")
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"sigpac_reference" text NOT NULL,
	"name" text NOT NULL,
	"geometry" geometry(Polygon, 4326) NOT NULL,
	"area_hectares" numeric(10, 4) NOT NULL,
	"crop" text,
	"crop_variety" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phytosanitary_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_name" text NOT NULL,
	"active_ingredient" text NOT NULL,
	"mapa_registration" text,
	"formulation" text,
	"lot_number" text NOT NULL,
	"expires_at" date NOT NULL,
	"recommended_dose_value" numeric(8, 3),
	"recommended_dose_unit" "dose_unit",
	"safety_period_days" numeric(5, 1),
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"parcel_id" uuid,
	"season" text NOT NULL,
	"crop" text NOT NULL,
	"planned_treatments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "mission_type" DEFAULT 'aerial_application' NOT NULL,
	"status" "mission_status" DEFAULT 'draft' NOT NULL,
	"client_id" uuid NOT NULL,
	"pilot_id" uuid,
	"drone_id" uuid,
	"npta_reference" text NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"area_planned_ha" numeric(10, 4),
	"area_treated_ha" numeric(10, 4),
	"weather_snapshot" jsonb,
	"telemetry" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "missions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mission_parcels" (
	"mission_id" uuid NOT NULL,
	"parcel_id" uuid NOT NULL,
	"area_treated_ha" numeric(10, 4),
	CONSTRAINT "mission_parcels_mission_id_parcel_id_pk" PRIMARY KEY("mission_id","parcel_id")
);
--> statement-breakpoint
CREATE TABLE "mission_phyto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_used" text NOT NULL,
	"applied_dose_value" numeric(8, 3) NOT NULL,
	"applied_dose_unit" "dose_unit" NOT NULL,
	"total_amount_used" numeric(10, 3),
	"total_amount_unit" text,
	"area_covered_ha" numeric(10, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices_ref" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"holded_invoice_id" text,
	"holded_invoice_number" text,
	"holded_invoice_url" text,
	"amount" numeric(12, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_ref_mission_id_unique" UNIQUE("mission_id"),
	CONSTRAINT "invoices_ref_holded_invoice_id_unique" UNIQUE("holded_invoice_id")
);
--> statement-breakpoint
ALTER TABLE "albarans" ADD CONSTRAINT "albarans_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_parcels" ADD CONSTRAINT "mission_parcels_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_parcels" ADD CONSTRAINT "mission_parcels_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_phyto" ADD CONSTRAINT "mission_phyto_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_phyto" ADD CONSTRAINT "mission_phyto_product_id_phytosanitary_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."phytosanitary_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices_ref" ADD CONSTRAINT "invoices_ref_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "parcels_geometry_gist_idx" ON "parcels" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "parcels_client_idx" ON "parcels" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "parcels_sigpac_idx" ON "parcels" USING btree ("sigpac_reference");--> statement-breakpoint
CREATE INDEX "treatment_plans_client_idx" ON "treatment_plans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "missions_status_idx" ON "missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "missions_scheduled_idx" ON "missions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "missions_client_idx" ON "missions" USING btree ("client_id");