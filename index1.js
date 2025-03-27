import express from 'express';
import { initializeDatabase } from './src/database/database.js';
import loginRouter from './src/routes/login.route.js';
import profileRouter from './src/routes/profile.route.js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', loginRouter, profileRouter);

app.listen(PORT, () => {
    //initializeDatabase();
    var client = new pg.Client('postgres://fsplus:group6@localhost:5432/friendship_plus')
    client.connect();

    console.log(`Server is running on port ${PORT}`);
});