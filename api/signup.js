// base-nav-backend/api/signup.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Reusable connection instance
let db;

async function connectToDatabase() {
  if (db) return db;

  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(); // Use default database from connection string
  return db;
}

export default async function handler(req, res) {
  console.log('Backend: /api/signup function was hit!'); // <-- Is it here?

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password, username } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ message: 'Invalid email or password (must be at least 6 characters).' });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
  }

  try {
    console.log('Connecting to DB...');
    const database = await connectToDatabase();

    console.log('Checking existing user...');
    const usersCollection = database.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    console.log('Hashing password...');
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('Inserting new user...');
    // Insert new user
    const result = await usersCollection.insertOne({
      email,
      password: hashedPassword,
    });

    console.log('Generating JWT...');
    // Generate JWT token
    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('User registered successfully:', result.insertedId);
    res.status(201).json({ message: 'User created successfully!', token, user: { id: result.insertedId, email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}