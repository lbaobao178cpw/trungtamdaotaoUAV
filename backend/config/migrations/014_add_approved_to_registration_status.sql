-- Add 'approved' value to exam_registrations.status enum
-- Backup your database before running.

ALTER TABLE exam_registrations
  MODIFY COLUMN status ENUM('registered','cancelled','passed','failed','approved') NOT NULL DEFAULT 'registered';

-- Note: If your MySQL version does not allow MODIFY with enum expansion when rows contain invalid values,
-- run these steps manually:
-- 1) ALTER TABLE exam_registrations ADD COLUMN status_tmp ENUM('registered','cancelled','passed','failed','approved') NOT NULL DEFAULT 'registered';
-- 2) UPDATE exam_registrations SET status_tmp = status;
-- 3) ALTER TABLE exam_registrations DROP COLUMN status;
-- 4) ALTER TABLE exam_registrations CHANGE status_tmp status ENUM('registered','cancelled','passed','failed','approved') NOT NULL DEFAULT 'registered';
