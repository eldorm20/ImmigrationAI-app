CREATE TABLE IF NOT EXISTS "file_blobs" (
	"key" varchar(500) PRIMARY KEY NOT NULL,
	"file_data" bytea NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
