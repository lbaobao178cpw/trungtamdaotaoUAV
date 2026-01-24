-- Migration: Add display_name column to lessons table
-- Purpose: Store the original filename for document files

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(500) NULL AFTER video_url;

-- Add index for faster lookups
ALTER TABLE lessons ADD INDEX idx_lessons_type (type);
