-- Force add lawyer_id if missing (using raw SQL that handles errors gracefully)
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE "applications" ADD COLUMN "lawyer_id" varchar(255);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_lawyer_id_users_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "users"("id") ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

CREATE INDEX IF NOT EXISTS "applications_lawyer_id_idx" ON "applications" ("lawyer_id");
