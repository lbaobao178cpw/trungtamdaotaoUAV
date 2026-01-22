-- Migration: Make rating column nullable in comments table
-- This allows comments without ratings

ALTER TABLE comments 
MODIFY COLUMN rating INT NULL DEFAULT NULL;
