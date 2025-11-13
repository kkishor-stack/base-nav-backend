// models/ReportingHazards.js
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
    type: String, 
    enum: ["pending", "accepted", "rejected", "active", "expired"], 
    default: "pending" 
  },
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

// ✅ Declare models
const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);
const HazardsVerified = mongoose.models.HazardsVerified || mongoose.model("HazardsVerified", ReportSchema);

// ✅ Middleware: Auto-verify when 5+ supports reached
ReportSchema.post("save", async function (doc) {
  try {
    // Skip if already accepted
    if (doc.status === "accepted") return;

    // Proceed only if supports are 5 or more
    if (doc.approvedBy && doc.approvedBy.length >= 5) {
      console.log(`⚡ Report ${doc._id} reached ${doc.approvedBy.length} supports → verifying...`);

      // Update report status to accepted
      await mongoose.model("Report").findByIdAndUpdate(doc._id, { status: "accepted" });

      // Clone into HazardsVerified (upsert to avoid duplicates)
      await HazardsVerified.findOneAndUpdate(
        { _id: doc._id },
        doc.toObject(),
        { upsert: true, new: true }
      );

      console.log(`✅ Report ${doc._id} added to HazardsVerified.`);
    }
  } catch (err) {
    console.error("❌ Error in report verification middleware:", err);
  }
});

export { Report, HazardsVerified };
