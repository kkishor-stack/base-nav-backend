import mongoose from "mongoose";

const HazardSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  type: String,
  severity: String,
  reportedBy: String,
  reportedAt: Date,
  verifiedCount: Number,
  active: Boolean,
  description: String,
  images: [String],
  expiresAt: Date
});

export default mongoose.models.Hazard || mongoose.model("Hazard", HazardSchema);
