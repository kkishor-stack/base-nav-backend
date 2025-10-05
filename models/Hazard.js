import mongoose from "mongoose";

const HazardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    required: true,
    enum: ["pothole", "construction", "accident", "road_closed", "flooding", "other"]
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  description: String,
  reportedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

HazardSchema.index({ location: "2dsphere" });

export default mongoose.models.Hazard || mongoose.model("Hazard", HazardSchema);
