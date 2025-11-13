// scripts/simulateVerification.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { Report, HazardsVerified } from "../models/ReportingHazards.js";

// 🔹 Add your test user ObjectIds (replace with real ones from your Users collection)
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

const randomSubset = (arr, n) => {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

const simulateVerification = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB ✅");

    // Fetch all reports (you can filter e.g. { status: 'pending' })
    const reports = await Report.find({ status: "pending" });

    // Pick random subset of reports to mark as accepted
    const selectedReports = randomSubset(reports, Math.floor(reports.length * 0.4)); // ~40% get accepted

    for (const report of selectedReports) {
      const approverCount = Math.floor(Math.random() * 5) + 3; // 3–7
      let approvers = randomSubset(USER_IDS, approverCount);

      // Always include the creator
      if (!approvers.some(id => id.equals(report.userId))) {
        approvers.push(report.userId);
      }

      // Remove duplicates just in case
      approvers = [...new Set(approvers.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));

      report.status = "accepted";
      report.approvedBy = approvers;

      await report.save();

      // Optionally, insert into HazardsVerified
      await HazardsVerified.create(report.toObject());
    }

    console.log(`✅ ${selectedReports.length} reports marked as accepted and moved to HazardsVerified`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
};

simulateVerification();
