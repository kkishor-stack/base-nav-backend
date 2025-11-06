// models/Report.js
import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  type: { type: String, default: "general" }, // accident, construction, police, etc
  description: { type: String, default: "" },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  reportedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "accepted", "rejected", "active", "expired"], default: "pending" },
  severity: {
    type: String,
    enum: ["low", "normal", "high", "critical"], // Optional enum for control
    default: "normal" // ✨ Sets the default to "normal"
  },
  approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  disapprovedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  images: { type: [String], default: [] },
  expiresAt: Date

}, { timestamps: true });

ReportSchema.index({ location: "2dsphere" });

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
