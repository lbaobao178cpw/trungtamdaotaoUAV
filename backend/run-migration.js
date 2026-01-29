const db = require('./config/db');

(async () => {
  try {
    console.log('Running migration: Adding tier_b_services column...');
    const [result] = await db.query(
      "ALTER TABLE user_profiles ADD COLUMN tier_b_services JSON NULL COMMENT 'JSON array of selected Tier B service IDs'"
    );
    console.log('✓ Migration success! Column added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ Column tier_b_services already exists.');
    } else {
      console.error('✗ Migration error:', err.message);
    }
  } finally {
    process.exit(0);
  }
})();
