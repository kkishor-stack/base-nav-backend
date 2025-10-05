// models/Route.js
import mongoose from "mongoose";

const RouteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  origin: {
    lat: Number,
    lng: Number,
    address: String
  },
  destination: {
    lat: Number,
    lng: Number,
    address: String
  },
  routePolyline: { type: String, default: "" }, // optional encoded polyline
  distance: Number, // meters
  duration: Number, // seconds
  hazardsEncountered: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hazard" }],
  completedAt: { type: Date, default: Date.now },
  isFavorite: { type: Boolean, default: false },
  nickname: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.models.Route || mongoose.model("Route", RouteSchema);
