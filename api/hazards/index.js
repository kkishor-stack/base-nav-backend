// api/hazards/index.js
import dbConnect from "../../lib/dbconnect";
import Hazard from "../../models/Hazard";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const { lat, lng, radius } = req.query;
      if (lat && lng) {
        // simple bounding box (approx) to reduce results before precise filter
        const r = Number(radius || 200); // meters default 200m
        const degDelta = r / 111000; // ~degrees latitude per meter
        const minLat = Number(lat) - degDelta;
        const maxLat = Number(lat) + degDelta;
        const minLng = Number(lng) - degDelta;
        const maxLng = Number(lng) + degDelta;

        const candidates = await Hazard.find({
          lat: { $gte: minLat, $lte: maxLat },
          lng: { $gte: minLng, $lte: maxLng },
          active: true
        });

        // optional: more precise distance filter (Pythagorean approx)
        const filtered = candidates.filter(h => {
          const dLat = (h.lat - Number(lat)) * 111000;
          const dLng = (h.lng - Number(lng)) * 111000 * Math.cos(Number(lat) * Math.PI / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          return dist <= r;
        });

        return res.status(200).json(filtered);
      } else {
        const all = await Hazard.find({ active: true }).sort({ reportedAt: -1 }).limit(500);
        return res.status(200).json(all);
      }
    } catch (err) {
      console.error("Hazards GET error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    // Protected: only logged-in users can create hazards
    let decoded;
    try {
      decoded = verifyToken(req, res);
    } catch (err) {
      return; // verifyToken sent response
    }

    try {
      const body = req.body;
      // require lat/lng minimally
      if (!body.lat || !body.lng) return res.status(400).json({ error: "lat and lng required" });

      const hazard = await Hazard.create({
        ...body,
        reportedBy: decoded.id || decoded._id || decoded
      });

      return res.status(201).json(hazard);
    } catch (err) {
      console.error("Hazards POST error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
