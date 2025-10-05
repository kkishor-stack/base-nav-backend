// models/Place.js
import mongoose from "mongoose";

const PlaceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  address: { type: String, default: "" },
  location: { lat: Number, lng: Number },
  icon: { type: String, default: "" },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Place || mongoose.model("Place", PlaceSchema);
