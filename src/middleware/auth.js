// auth.js middleware
import jwt from 'jsonwebtoken';

//const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = "place-jwt-token-here"

export const createToken = (user) => {
    console.log("process.env.JWT_SECRET:",process.env.JWT_SECRET)
    console.log("JWT_SECRET:",JWT_SECRET)
    return jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

export const verifyToken = (req, res, next) => {
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});

    const token = cookies?.token;
    
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};