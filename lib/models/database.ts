import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (process.env.DATABASE_URL) {
      // Use DATABASE_URL (preferred for Supabase)
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Required for Supabase
        },
        // Optimize for serverless functions
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      // Fallback to individual environment variables
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_HOST?.includes('supabase.com') ? {
          rejectUnauthorized: false
        } : false,
        // Optimize for serverless functions
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    
    // Handle connection errors
    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
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

    // Create cme_videos table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cme_videos (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('ccor1', 'lasco-c2', 'lasco-c3')),
        video_url TEXT NOT NULL,
        image_count INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
        date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(type, date_range_start, date_range_end)
      );
    `);

    // Create index for faster queries on CME videos
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cme_videos_type_created 
      ON cme_videos(type, created_at DESC);
    `);

    // Create suv_videos table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suv_videos (
        id SERIAL PRIMARY KEY,
        type VARCHAR(10) NOT NULL CHECK (type IN ('304')),
        video_url TEXT NOT NULL,
        image_count INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
        date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(type, date_range_start, date_range_end)
      );
    `);

    // Create index for faster queries on SUV videos
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_suv_videos_type_created 
      ON suv_videos(type, created_at DESC);
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