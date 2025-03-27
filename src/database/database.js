import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    //connectionString: process.env.DATABASE_URL,
     password: 'group6',
     user: 'fsplus',
     host: 'localhost',
     database: 'friendship_plus',
     port: 5432,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : undefined
});

export const initializeDatabase = async () => {
    //const client = await pool.connect()
    //.then(() => console.log("Connected to Database"))
    //.catch( error => console.error("Database connection error:", error));
    const client = pool;
    
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP WITH TIME ZONE
            );

            CREATE TABLE IF NOT EXISTS auth_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                token_expires TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
            );

            CREATE TABLE IF NOT EXISTS profile (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                bio TEXT,
                profile_pic TEXT,
                age INTEGER,
                location TEXT,
                interests TEXT,
                courses TEXT,
                school TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) {
        console.error('Failed to initialize database', e);
    } finally {
        //client.release();
    }
}

export const getDatabase = () => pool;