// base-nav-backend/api/login.js

import dbConnect from "../lib/dbconnect";
import User from "../models/Users";
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// let db;

// async function connectToDatabase() {
//     if (db) return db;
//     const client = new MongoClient(process.env.MONGODB_URI);
//     await client.connect();
//     db = client.db();
//     return db;
// }

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        await dbConnect();
        // const usersCollection = database.collection('users');

        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Invalid username.' });

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate a JWT
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        res.status(200).json({
            message: 'Login successful!',
            token: token,
            user: {
                id: user._id,
                email: user.email,
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}