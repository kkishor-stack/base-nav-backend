// models/Report.js
import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  type: { type: String, default: "general" }, // accident, construction, police, etc
  details: { type: String, default: "" },
  location: { lat: Number, lng: Number },
  reportedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active","resolved","expired"], default: "active" },
  confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deniedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ttl: { type: Number, default: 60 } // minutes
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
