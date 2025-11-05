// /api/deleteUsers.js
import mongoose from "mongoose";
import Report from "../models/ReportingHazards.js"; // adjust path to your model

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (!MONGODB_URI) throw new Error("⚠️ Missing MONGODB_URI in environment");
  await mongoose.connect(MONGODB_URI);
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { filter } = req.body; // filter passed from frontend
    if (!filter || typeof filter !== "object") {
      return res.status(400).json({ error: "Missing or invalid filter" });
    }

    const result = await Report.deleteMany(filter);

    res.status(200).json({
      message: "Documents deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    await mongoose.connection.close().catch(()=> {});
  }
}