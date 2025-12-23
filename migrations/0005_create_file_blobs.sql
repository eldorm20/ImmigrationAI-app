CREATE TABLE IF NOT EXISTS file_blobs (
  key text PRIMARY KEY,
  file_data bytea NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
