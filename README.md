# Friendship Plus

A platform designed to help students connect with others who share similar academic interests, courses, and schools.

## 🌟 Overview

Friendship Plus is a full-stack web application that enables students to create profiles, search for peers with similar interests, and build meaningful connections. Whether you're looking for study partners, project collaborators, or just friends with similar academic pursuits, Friendship Plus helps you find and connect with them.

## ✨ Features

- **User Authentication**: Secure signup and login with JWT token-based authentication
- **Profile Management**: Create and update detailed profiles including:
  - Bio
  - Profile picture (with automatic compression)
  - Age
  - Location
  - Interests (stored as searchable arrays)
  - Courses
  - School
- **Interest-Based Search**: Find other students who share specific interests
- **Responsive Design**: Works on both desktop and mobile devices

## 🛠️ Technology Stack

### Frontend
- React.js
- Axios for API requests
- React Router for navigation
- Local storage for client-side data persistence
- Image compression for profile pictures

### Backend
- Node.js with Express
- PostgreSQL database
- JWT for authentication
- Multer for file uploads
- Sharp for image processing
- CORS configuration for cross-domain requests

### Deployment
- Frontend: Vercel
- Backend: Heroku
- Database: Heroku PostgreSQL

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone https://github.com/IanM21/capstone-backend
cd capstone-backend
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PORT=3001
NODE_ENV=development
```

4. Start the backend server
```bash
npm run dev
```


The application should now be running on `http://localhost:3001`.

## 📊 Database Schema

The application uses three main tables:

1. **users**: Stores user account information
   - id, username, password_hash, email, phone, first_name, last_name, created_at, last_login

2. **auth_tokens**: Manages authentication tokens
   - id, user_id, token, created_at, token_expires

3. **profile**: Contains user profile details
   - id, user_id, bio, profile_pic, age, location, interests (array), courses, school, created_at

## 🔒 API Endpoints

### Authentication
- `POST /api/signup`: Register a new user
- `POST /api/login`: Authenticate a user and receive a token
- `POST /api/logout`: Log out a user and invalidate their token

### User Management
- `GET /api/user/:userId`: Get user information
- `PUT /api/user/:userId`: Update user information
- `DELETE /api/user/:userId`: Delete a user account
- `GET /api/users`: Get all users (for admin purposes)

### Profile Management
- `POST /api/profile/:userId`: Create or update a user profile
- `GET /api/profile/:userId`: Retrieve a user profile
- `GET /api/profile`: Get all profiles
- `GET /api/profile/search/:interest`: Search for profiles by interest

## 🌐 Deployment

### Frontend
The frontend is deployed on Vercel at https://friendship-plus.vercel.app

### Backend
The backend API is hosted on Heroku at https://capstone-friendship-plus-ce79680bc1a8.herokuapp.com

## 🔍 Debugging

Common issues and solutions:

- **CORS errors**: Make sure the backend CORS settings include your frontend domain
- **Authentication errors**: Check that your JWT token is being properly sent in the Authorization header
- **Profile image upload issues**: Ensure the image is smaller than 1MB and is a supported format (JPEG, PNG)

## 👥 Contributors

- Ian McDonald
- Neeta Pant
- Kevin Bhangu
- Jaskiran Gill
