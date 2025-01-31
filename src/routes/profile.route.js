import express from 'express';
import { getDatabase } from '../database/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// create/update profile route
router.post('/profile/:userId', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;
        const { bio, profilePic, age, location, interests, courses, school } = req.body;

        if (req.userId !== parseInt(req.params.userId)) {
            return res.status(403).json({ error: 'Unauthorized to modify this profile' });
        }

        if (age && (age < 13 || age > 120)) {
            return res.status(400).json({ error: 'Invalid age' });
        }

        await client.query('BEGIN');

        const profileExists = await client.query(
            'SELECT id FROM profile WHERE user_id = $1',
            [userId]
        );

        let result;
        if (profileExists.rows.length === 0) {
            result = await client.query(
                `INSERT INTO profile (user_id, bio, profile_pic, age, location, interests, courses, school)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, bio, profilePic, age, location, interests, courses, school]
            );
        } else {
            result = await client.query(
                `UPDATE profile 
               SET bio = COALESCE($1, bio),
                   profile_pic = COALESCE($2, profile_pic),
                   age = COALESCE($3, age),
                   location = COALESCE($4, location),
                   interests = COALESCE($5, interests),
                   courses = COALESCE($6, courses),
                   school = COALESCE($7, school)
               WHERE user_id = $8
               RETURNING *`,
                [bio, profilePic, age, location, interests, courses, school, userId]
            );
        }

        await client.query('COMMIT');
        return res.json({ success: true, profile: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Profile update error:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
    } finally {
        client.release();
    }
});

// fetch profile by user ID
router.get('/profile/:userId', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;
        const result = await client.query(
            'SELECT * FROM profile WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        return res.json({ success: true, profile: result.rows[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    } finally {
        client.release();
    }
});

export default router;