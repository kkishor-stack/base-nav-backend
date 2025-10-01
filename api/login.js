// base-nav-backend/api/login.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let db;

async function connectToDatabase() {
    if (db) return db;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
    return db;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const database = await connectToDatabase();
        const usersCollection = database.collection('users');

        // Find the user by email
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate a JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
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