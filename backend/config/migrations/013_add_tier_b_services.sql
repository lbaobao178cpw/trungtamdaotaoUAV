-- Add tier_b_services column to store selected Tier B services
ALTER TABLE user_profiles ADD COLUMN tier_b_services JSON NULL COMMENT 'JSON array of selected Tier B service IDs';
