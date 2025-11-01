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
  status: {
    type: String, enum: ["pending", "verified", "rejected", "active", "resolved", "expired"],
    default: "pending"
  },
  confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deniedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ttl: { type: Number, default: 60 } // minutes
}, { timestamps: true });

ReportSchema.index({ location: "2dsphere" });

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
