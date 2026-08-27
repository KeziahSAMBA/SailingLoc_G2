-- Keep the detected content type next to private files so download responses
-- do not have to trust a user-controlled filename or MIME header.
ALTER TABLE "document" ADD COLUMN "mime_type" VARCHAR(100);
ALTER TABLE "image" ADD COLUMN "mime_type" VARCHAR(100);
