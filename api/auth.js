import dbConnect from "../lib/dbconnect.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    await dbConnect();

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { action, username, email, password } = req.body;

    if (!action) return res.status(400).json({ error: "Action required" });

    try {
        if (action === "signup") {
            if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });

            const existing = await User.findOne({ $or: [{ username }, { email }] });
            if (existing) return res.status(400).json({ error: "Username or email exists" });

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({ username, email, password: hashedPassword });

            // Generate JWT token
            const token = jwt.sign({ id: newUser._id, username, email }, process.env.JWT_SECRET, { expiresIn: "7d" });

            return res.status(201).json({
                message: "Signup successful",
                token,
                user: { id: newUser._id, username: newUser.username, email: newUser.email },
            });
        }

        if (action === "login") {
            if (!username || !password) return res.status(400).json({ error: "Username and password required" });

            const user = await User.findOne({ username });
            if (!user) return res.status(400).json({ error: "Invalid username" });

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return res.status(400).json({ error: "Invalid credentials" });

            const token = jwt.sign({ id: user._id, username, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

            return res.status(200).json({
                message: 'Login successful!', token: token,
                user: { id: user._id, email: user.email, username: user.username },
            });
        }

        return res.status(400).json({ error: "Invalid action" });
    } catch (err) {
        console.error("Auth error:", err);
        return res.status(500).json({ error: "Internal Server error" });
    }
}
