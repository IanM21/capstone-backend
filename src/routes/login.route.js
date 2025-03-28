import express from 'express';
import bcrypt from 'bcrypt';
import { getDatabase } from '../database/database.js';
import { createToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// register route
router.post('/signup', async (req, res) => {
    const client = await getDatabase().connect();
    
    try {
        const { username, password, email, phone, firstName, lastName } = req.body;
        const requiredFields = ['username', 'password', 'email', 'phone', 'firstName', 'lastName'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        
        await client.query('BEGIN');

        const existingUser = await client.query(
            'SELECT username, email, phone FROM users WHERE username = $1 OR email = $2 OR phone = $3',
            [username.trim(), email.trim(), phone.trim()]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            const duplicate = existingUser.rows[0];
            const duplicateFields = [];

            if (duplicate.username === username.trim()) duplicateFields.push('username');
            if (duplicate.email === email.trim()) duplicateFields.push('email');
            if (duplicate.phone === phone.trim()) duplicateFields.push('phone');

            return res.status(400).json({
                error: `The following fields already exist: ${duplicateFields.join(', ')}`
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await client.query(
            `INSERT INTO users (username, password_hash, email, phone, first_name, last_name) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, username, created_at`,
            [username.trim(), hashedPassword, email.trim(), phone.trim(), firstName.trim(), lastName.trim()]
        );

        await client.query('COMMIT');

        return res.json({
            success: true,
            user: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                created_at: result.rows[0].created_at
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Failed to create user' });
    } finally {
        client.release();
        console.log('Client released');
    }
});

// Login route
router.post('/login', async (req, res) => { 
    const client = await getDatabase().connect();

    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        await client.query('BEGIN');

        // Get user and password hash
        const userResult = await client.query(
            'SELECT id, username, password_hash FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = userResult.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            await client.query('ROLLBACK');
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        await client.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = createToken(user);

        
        await client.query(
            'INSERT INTO auth_tokens (user_id, token) VALUES ($1, $2)',
            [user.id, token]
        );
        
        await client.query('COMMIT');

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.json({ 
            success: true,
            message: 'Login successful for user ' + user.username,
            userID: user.id,
            token: token
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    } finally {
        client.release();
        console.log('Client released');
    }
});

// Logout route
router.post('/logout', async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});

        const token = cookies?.token;
        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }

        await client.query('DELETE FROM auth_tokens WHERE token = $1', [token]);
        res.clearCookie('token');
        return res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Logout failed' });
    } finally {
        client.release();
    }
});

// Get User by ID
router.get('/user/:userId', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;
        if (req.userId !== parseInt(userId)) {
            return res.status(403).json({ error: 'Unauthorized to view this user' });
        }

        const result = await client.query(
            'SELECT id, username, email, phone, first_name, last_name FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ error: 'Failed to get user' });
    } finally {
        client.release();
    }
});

// Update user by ID
router.put('/user/:userId', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;
        if (req.userId !== parseInt(userId)) {
            return res.status(403).json({ error: 'Unauthorized to modify this user' });
        }

        const { username, email, phone, firstName, lastName } = req.body;

        await client.query('BEGIN');

        // Check for duplicates
        const duplicateCheck = await client.query(
            'SELECT username, email, phone FROM users WHERE (username = $1 OR email = $2 OR phone = $3) AND id != $4',
            [username, email, phone, userId]
        );

        if (duplicateCheck.rows.length > 0) {
            const duplicates = [];
            if (duplicateCheck.rows[0].username === username) duplicates.push('username');
            if (duplicateCheck.rows[0].email === email) duplicates.push('email');
            if (duplicateCheck.rows[0].phone === phone) duplicates.push('phone');

            await client.query('ROLLBACK');
            return res.status(400).json({ error: `${duplicates.join(', ')} already exist` });
        }

        const result = await client.query(
            `UPDATE users 
           SET username = COALESCE($1, username),
               email = COALESCE($2, email),
               phone = COALESCE($3, phone),
               first_name = COALESCE($4, first_name),
               last_name = COALESCE($5, last_name)
           WHERE id = $6
           RETURNING id, username, email, phone, first_name, last_name`,
            [username, email, phone, firstName, lastName, userId]
        );

        await client.query('COMMIT');
        return res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('User update error:', error);
        return res.status(500).json({ error: 'Failed to update user' });
    } finally {
        client.release();
    }
});

// Get All Users (for demonstration purpose and for search functionality) - added by Neeta
router.get('/users', verifyToken, async (req, res) => {
    const client = await getDatabase().connect(); // connects to database
    try {
        const result = await client.query( // queries the table users to read this information
            'SELECT id, username, email, phone, first_name, last_name, created_at, last_login FROM users'
        );
        console.log(result.rows)

        if (result.rows.length === 0) { // if no result found, return error with status code 404 
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ success: true, user: result.rows }); // returns all user's information
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ error: 'Failed to get user' });
    } finally {
        client.release();
    }
});

// delete user by ID
router.delete('/user/:userId', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;

        if (req.userId !== parseInt(userId)) {
            return res.status(403).json({ error: 'Unauthorized to delete this user' });
        }

        await client.query('BEGIN');

        // Delete profile first due to foreign key constraint
        await client.query('DELETE FROM profile WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM auth_tokens WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        await client.query('COMMIT');
        return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete user error:', error);
        return res.status(500).json({ error: 'Failed to delete user' });
    } finally {
        client.release();
    }
});

export default router;