import mongoose from "mongoose";

let isConnected = false;

export default async function connectDB() {
  if (isConnected) return;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}
