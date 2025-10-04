import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Use individual environment variables if DATABASE_URL is not available
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      pool = new Pool({
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'cosmotrix_db',
        user: process.env.DB_USER || 'cosmotrix_user',
        password: process.env.DB_PASSWORD || 'cosmotrix123',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
    }
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const pool = getPool();
  
  try {
    // Create aurora_videos table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aurora_videos (
        id SERIAL PRIMARY KEY,
        hemisphere VARCHAR(10) NOT NULL CHECK (hemisphere IN ('north', 'south')),
        video_url TEXT NOT NULL,
        image_count INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
        date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(hemisphere, date_range_start, date_range_end)
      );
    `);

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_aurora_videos_hemisphere_created 
      ON aurora_videos(hemisphere, created_at DESC);
    `);

    // Keep the old aurora_gifs table for backward compatibility (optional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aurora_gifs (
        id SERIAL PRIMARY KEY,
        hemisphere VARCHAR(10) NOT NULL CHECK (hemisphere IN ('north', 'south')),
        gif_url TEXT NOT NULL,
        image_count INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
        date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(hemisphere, date_range_start, date_range_end)
      );
    `);

    // Create index for old table too
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_aurora_gifs_hemisphere_created 
      ON aurora_gifs(hemisphere, created_at DESC);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}