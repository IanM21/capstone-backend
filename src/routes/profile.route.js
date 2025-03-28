import express from 'express';
import { getDatabase } from '../database/database.js';
import { verifyToken } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow image uploads
const fileFilter = (_, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Not an allowed file type. Please upload JPEG or PNG only.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Create/update profile route
router.post('/profile/:userId', verifyToken, upload.single('profilePicture'), async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { userId } = req.params;
        const { bio, age, location, interests, courses, school } = req.body;

        // Convert userId to integer for comparison
        if (req.userId !== parseInt(userId)) {
            return res.status(403).json({ error: 'Unauthorized to modify this profile' });
        }

        if (age && (parseInt(age) < 13 || parseInt(age) > 120)) {
            return res.status(400).json({ error: 'Invalid age' });
        }

        // Process interests as an array
        let interestsArray = interests;
        // If interests comes as a string, parse it (from JSON) or split it
        if (interests && typeof interests === 'string') {
            try {
                // Try to parse as JSON first (if sent as JSON string)
                interestsArray = JSON.parse(interests);
            } catch (e) {
                // If not valid JSON, split by commas (if sent as comma-separated string)
                interestsArray = interests.split(',').map(item => item.trim());
            }
        }

        // Convert image to base64 string if uploaded
        let profilePic = null;
        if (req.file) {
            // Store as base64 data URI
            const base64Data = req.file.buffer.toString('base64');
            profilePic = `data:${req.file.mimetype};base64,${base64Data}`;
        }

        await client.query('BEGIN');

        const profileExists = await client.query(
            'SELECT id FROM profile WHERE user_id = $1',
            [userId]
        );

        let result;
        if (profileExists.rows.length === 0) {
            // Insert new profile with base64 image data
            result = await client.query(
                `INSERT INTO profile (
                    user_id, bio, profile_pic, age, location, interests, courses, school
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING id, user_id, bio, age, location, interests, courses, school`,
                [
                    userId, bio, profilePic,
                    age, location, interestsArray, courses, school
                ]
            );
        } else {
            // Only update profile picture if a new one was provided
            if (req.file) {
                result = await client.query(
                    `UPDATE profile 
                    SET bio = COALESCE($1, bio),
                        profile_pic = $2,
                        age = COALESCE($3, age),
                        location = COALESCE($4, location),
                        interests = COALESCE($5, interests),
                        courses = COALESCE($6, courses),
                        school = COALESCE($7, school)
                    WHERE user_id = $8
                    RETURNING id, user_id, bio, age, location, interests, courses, school`,
                    [
                        bio || null,
                        profilePic,
                        age || null,
                        location || null,
                        interestsArray || null,
                        courses || null,
                        school || null,
                        userId
                    ]
                );
            } else {
                // Update without changing the profile picture
                result = await client.query(
                    `UPDATE profile 
                    SET bio = COALESCE($1, bio),
                        age = COALESCE($2, age),
                        location = COALESCE($3, location),
                        interests = COALESCE($4, interests),
                        courses = COALESCE($5, courses),
                        school = COALESCE($6, school)
                    WHERE user_id = $7
                    RETURNING id, user_id, bio, age, location, interests, courses, school`,
                    [
                        bio || null,
                        age || null,
                        location || null,
                        interestsArray || null,
                        courses || null,
                        school || null,
                        userId
                    ]
                );
            }
        }

        await client.query('COMMIT');

        return res.json({
            success: true,
            profile: result.rows[0],
            message: 'Profile updated successfully',
            hasProfilePic: !!profilePic
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Profile update error:', error);
        return res.status(500).json({ error: 'Failed to update profile: ' + error.message });
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

// Get All Profiles (for search functionality) - added by Neeta
router.get('/profile', verifyToken, async (req, res) => {
    const client = await getDatabase().connect(); // connects to database
    try {
        const result = await client.query( // queries the table users to read this information
            'SELECT user_id, profile_pic, location, interests, courses, school FROM profile'
        );

        if (result.rows.length === 0) { // if no result found, return error with status code 404 
            return res.status(404).json({ error: 'Profile not found' });
        }

        return res.json({ success: true, profiles: result.rows }); // returns all user's information
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ error: 'Failed to get user' });
    } finally {
        client.release();
    }
});

// Search profiles by interest
router.get('/profile/search/:interest', verifyToken, async (req, res) => {
    const client = await getDatabase().connect();
    try {
        const { interest } = req.params;

        // Find profiles where the interests array contains the specified interest
        const profilesResult = await client.query(
            'SELECT user_id, profile_pic, age, location, interests, courses, school FROM profile WHERE $1 = ANY(interests)',
            [interest]
        );

        // If no profiles found, return empty array
        if (profilesResult.rows.length === 0) {
            return res.json({
                success: true,
                results: [],
                count: 0
            });
        }

        // Get all user_ids from the profile results
        const userIds = profilesResult.rows.map(profile => profile.user_id);

        // Get all corresponding users in a single query
        const usersResult = await client.query(
            'SELECT id, first_name, last_name FROM users WHERE id = ANY($1)',
            [userIds]
        );

        // Create a map for quick user lookup by id
        const userMap = {};
        usersResult.rows.forEach(user => {
            userMap[user.id] = {
                first_name: user.first_name,
                last_name: user.last_name
            };
        });

        // Combine user and profile data into a single clean result
        const combinedResults = profilesResult.rows.map(profile => {
            const user = userMap[profile.user_id];

            // Skip if no matching user found (shouldn't happen with proper foreign keys)
            if (!user) return null;

            return {
                user_id: profile.user_id,
                name: `${user.first_name} ${user.last_name}`,
                age: profile.age,
                location: profile.location,
                interests: profile.interests,
                courses: profile.courses,
                school: profile.school,
                profile_pic: profile.profile_pic
            };
        }).filter(result => result !== null); // Remove any nulls

        return res.json({
            success: true,
            results: combinedResults,
            count: combinedResults.length
        });
    } catch (error) {
        console.error('Profile search error:', error);
        return res.status(500).json({ error: 'Failed to search profiles by interest' });
    } finally {
        client.release();
    }
});

export default router;