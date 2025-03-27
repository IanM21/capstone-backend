import express from 'express';
import { initializeDatabase } from './src/database/database.js';
import loginRouter from './src/routes/login.route.js';
import profileRouter from './src/routes/profile.route.js';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add cookie parser to handle cookies
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/api', loginRouter, profileRouter);

// Set the port explicitly to 3001
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log('before')
    initializeDatabase();
    console.log('after')
    console.log(`Server is running on port ${PORT}`);
});