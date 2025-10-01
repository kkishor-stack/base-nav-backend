// base-nav-backend/api/register.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Reusable connection instance
let db;

async function connectToDatabase() {
  if (db) return db;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(); // Use default database from connection string
  return db;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ message: 'Invalid email or password (must be at least 6 characters).' });
  }

  try {
    const database = await connectToDatabase();
    const usersCollection = database.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    await usersCollection.insertOne({
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: 'User created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}