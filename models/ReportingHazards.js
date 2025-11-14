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
ReportSchema.post("save", async function (doc) {
  try {
    // If supports are 5 or more, ensure an entry exists in HazardsVerified
    if (doc.approvedBy && doc.approvedBy.length >= 5) {
      console.log(`⚡ Report ${doc._id} reached ${doc.approvedBy.length} supports → verifying...`);

      // Update report status to accepted (use model by name)
      await mongoose.model("Report").findByIdAndUpdate(doc._id, { status: "accepted" });

      // At runtime, get the HazardsVerified model (will be compiled below)
      const HazardsVerifiedModel = mongoose.models.HazardsVerified || mongoose.model("HazardsVerified");

      // Clone into HazardsVerified (upsert to avoid duplicates)
      await HazardsVerifiedModel.findOneAndUpdate(
        { _id: doc._id },
        doc.toObject(),
        { upsert: true, new: true }
      );

      console.log(`✅ Report ${doc._id} added to HazardsVerified.`);
    } else {
      // If supports drop below 5, remove any existing copy from HazardsVerified
      try {
        const HazardsVerifiedModel = mongoose.models.HazardsVerified || mongoose.model("HazardsVerified");
        const existing = await HazardsVerifiedModel.findById(doc._id);
        if (existing) {
          await HazardsVerifiedModel.findByIdAndDelete(doc._id);
          console.log(`🗑️ Report ${doc._id} removed from HazardsVerified (supports < 5).`);
          // Also ensure original report status reflects pending if needed
          await mongoose.model("Report").findByIdAndUpdate(doc._id, { status: "pending" });
        }
      } catch (e) {
        // Not fatal — log and continue
        console.error("Error while removing from HazardsVerified:", e);
      }
    }
  } catch (err) {
    console.error("❌ Error in report verification middleware:", err);
  }
});

// ✅ Declare models (compile after middleware so the hook runs at save-time)
const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);
const HazardsVerified = mongoose.models.HazardsVerified || mongoose.model("HazardsVerified", ReportSchema);

export { HazardsVerified, Report };

