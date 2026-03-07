import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';

// Read the migration file
const migrationSQL = fs.readFileSync('./db/migrations/add_automated_news_fields.sql', 'utf8');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✓ Connected to database');
    console.log('📝 Executing migration...\n');

    // Execute the entire migration as one multi-statement query
    try {
      await connection.query(migrationSQL);
      console.log('✅ Migration completed successfully!');
      console.log('📊 Automated news fields have been added to the news table.');
    } catch (error) {
      // Check if error is about duplicate columns/indexes (which means migration already ran)
      if (error.code === 'ER_DUP_FIELDNAME' || 
          error.message.includes('Duplicate column') ||
          error.message.includes('duplicate key name')) {
        console.log('⚠ Some fields already exist - migration may have run previously');
        console.log('✓ Migration considered successful (idempotent)');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
