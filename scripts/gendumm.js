// scripts/generateDummyReports.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Report from "../models/Report.js";

const MONGO_URI = process.env.MONGODB_URI; // change this
const USER_ID = new mongoose.Types.ObjectId("69075ab67920ab4705cb6551");

const reportTypes = ["accident", "construction", "police", "traffic", "hazard", "general"];
const descriptions = [
  "Minor collision reported",
  "Road construction ahead",
  "Police checkpoint visible",
  "Heavy traffic near intersection",
  "Debris on the road",
  "General alert"
];

// Random coordinate generator (you can localize this range)
const randomCoordinate = () => {
  const lat = 28.6 + Math.random() * 0.2; // e.g. around Delhi
  const lng = 77.1 + Math.random() * 0.2;
  return [lng, lat];
};

const randomStatus = () => {
  const statuses = ["pending", "verified", "active", "resolved"];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const generateDummyReports = async (count = 50) => {
  const reports = [];

  for (let i = 0; i < count; i++) {
    reports.push({
      userId: USER_ID,
      type: reportTypes[Math.floor(Math.random() * reportTypes.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      location: {
        type: "Point",
        coordinates: randomCoordinate()
      },
      reportedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7), // within last 7 days
      status: randomStatus(),
      ttl: 30 + Math.floor(Math.random() * 120) // between 30–150 minutes
    });
  }

  return reports;
};

const main = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const reports = await generateDummyReports(100); // number of reports to insert
    await Report.insertMany(reports);

    console.log(`🗂️ ${reports.length} dummy reports created successfully`);
  } catch (err) {
    console.error("❌ Error generating dummy reports:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

main();
