// scripts/simulateVerification.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { Report, HazardsVerified } from "../models/ReportingHazards.js";

// 🔹 Replace with real User ObjectIds
const USER_IDS = [
  new mongoose.Types.ObjectId("6916394ddeee37f095939f4c"),
  new mongoose.Types.ObjectId("691632ecb6b74f485b6edf5f"),
  new mongoose.Types.ObjectId("691632bbb6b74f485b6edf5c"),
  new mongoose.Types.ObjectId("69163236b6b74f485b6edf59"),
  new mongoose.Types.ObjectId("6913b43bc4a8c31f0f07a470"),
  new mongoose.Types.ObjectId("690caed3e1d3ee6171792eb6"),
  new mongoose.Types.ObjectId("690c952dff6bcdf8f624c5b4"),
];

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI or MONGODB_URI");
  process.exit(1);
}

// Helper: pick random subset
const randomSubset = (arr, n) => {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

const simulateVerification = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Fetch all reports with pending status
    const reports = await Report.find({ status: "pending" });

    // Randomly choose about 40% to process
    const selectedReports = randomSubset(reports, Math.floor(reports.length * 0.5));

    let convertedCount = 0;

    for (const report of selectedReports) {
      // Randomly pick 3–7 approvers
      const approverCount = Math.floor(Math.random() * 5) + 2; // range 3–7
      let approvers = randomSubset(USER_IDS, approverCount);

      // Always include the report's creator
      if (!approvers.some(id => id.equals(report.userId))) {
        approvers.push(report.userId);
      }

      // Remove duplicates
      approvers = [...new Set(approvers.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

      // Update report with new approvers
      report.approvedBy = approvers;

      // Check if supports (unique approvers) >= 5
      if (approvers.length >= 5) {
        report.status = "accepted";

        // Save updated report
        await report.save();

        // Add to HazardsVerified
        await HazardsVerified.findOneAndUpdate(
          { _id: report._id },
          report.toObject(),
          { upsert: true } // create if not exists
        );

        convertedCount++;
      } else {
        // Less than 5 supports → still pending
        report.status = "pending";
        await report.save();
      }
    }

    console.log(`✅ ${convertedCount} reports reached 5+ supports and were moved to HazardsVerified.`);
  } catch (err) {
    console.error("❌ Error during simulation:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

simulateVerification();