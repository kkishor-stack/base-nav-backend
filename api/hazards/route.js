// api/hazards/route.js
import dbConnect from "../../lib/dbconnect";
import Hazard from "../../models/Hazard";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { routePath } = req.body; // expect array of { lat, lng }
  if (!Array.isArray(routePath) || routePath.length === 0) {
    return res.status(400).json({ error: "routePath required" });
  }

  try {
    // naive approach: fetch hazards in bounding box around route
    // Compute min/max lat/lng
    const lats = routePath.map(p => p.lat);
    const lngs = routePath.map(p => p.lng);
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;

    const candidates = await Hazard.find({
      lat: { $gte: minLat, $lte: maxLat },
      lng: { $gte: minLng, $lte: maxLng },
      active: true
    });

    // find hazards within ~100m of any route point (adjust threshold as you like)
    const thresholdMeters = 100;
    const nearby = candidates.filter(h => {
      return routePath.some(p => {
        const dLat = (h.lat - p.lat) * 111000;
        const dLng = (h.lng - p.lng) * 111000 * Math.cos(p.lat * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        return dist <= thresholdMeters;
      });
    });

    return res.status(200).json(nearby);
  } catch (err) {
    console.error("hazards/route error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
