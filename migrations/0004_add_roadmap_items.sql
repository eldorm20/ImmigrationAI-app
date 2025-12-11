-- Create roadmap_items table for tracking visa application progress
CREATE TABLE IF NOT EXISTS roadmap_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  status varchar(50) NOT NULL DEFAULT 'pending',
  "order" integer NOT NULL DEFAULT 0,
  due_date timestamp,
  completed_at timestamp,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Create indexes for roadmap_items
CREATE INDEX IF NOT EXISTS roadmap_application_id_idx ON roadmap_items(application_id);
CREATE INDEX IF NOT EXISTS roadmap_status_idx ON roadmap_items(status);
