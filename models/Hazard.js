import mongoose from "mongoose";

const HazardSchema = new mongoose.Schema({
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  type: String,
  severity: String,
  reportedBy: String,
  reportedAt: { type: Date, default: Date.now },
  verifiedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  description: String,
  images: [String],
  expiresAt: Date
});

HazardSchema.index({ location: "2dsphere" });

export default mongoose.models.Hazard || mongoose.model("Hazard", HazardSchema);
