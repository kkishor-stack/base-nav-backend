// scripts/deleteReports.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Report from "../models/Report.js";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("Missing MONGO_URI in environment variables.");

/**
 * Deletes reports using any valid MongoDB filter object.
 * @param {Object} filter - A MongoDB query object (e.g. { status: "pending" }).
 */
export async function deleteReports(filter = {}) {
  if (!filter || typeof filter !== "object" || Object.keys(filter).length === 0) {
    console.error("❌ No valid filter provided. Refusing to delete everything.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  try {
    const result = await Report.deleteMany(filter);
    console.log(`🗑️ Deleted ${result.deletedCount} reports matching:`, JSON.stringify(filter, null, 2));
  } catch (err) {
    console.error("❌ Error deleting reports:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// --- CLI mode: run with a JSON filter ---
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example usage:
  // node scripts/deleteReports.js '{"status":"pending"}'
  // node scripts/deleteReports.js '{"userId":"68e0e65f00e28d27a96c7c48"}'
  // node scripts/deleteReports.js '{"reportedAt":{"$lt":"2025-11-01T00:00:00Z"}}'

  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/deleteReports.js '{\"status\":\"pending\"}'");
    process.exit(1);
  }

  let filter;
  try {
    filter = JSON.parse(arg);
  } catch (err) {
    console.error("❌ Invalid JSON filter. Make sure you wrap it in single quotes.");
    console.error("Example: node scripts/deleteReports.js '{\"status\":\"pending\"}'");
    process.exit(1);
  }

  deleteReports(filter).then(() => process.exit(0));
}
