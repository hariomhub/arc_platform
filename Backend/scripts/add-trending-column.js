import pool from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addTrendingColumn() {
  try {
    console.log('Adding is_trending column to news table...');
    
    const sqlFile = path.join(__dirname, '..', 'db', 'add-trending-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await pool.query(statement);
          if (i === 0) console.log('✓ Trending column added successfully');
          if (i === 1) console.log('✓ Index created');
          if (i === 2) console.log('✓ Recent articles marked as trending');
        } catch (error) {
          // Ignore errors for column/index already exists
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✓ Trending column already exists');
          } else if (error.code === 'ER_DUP_KEYNAME') {
            console.log('✓ Index already exists');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addTrendingColumn();
