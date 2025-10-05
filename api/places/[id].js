// api/places/[id].js
import dbConnect from "../../lib/dbconnect";
import Place from "../../models/Place";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const place = await Place.findById(id);
    if (!place) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(place);
  }

  if (req.method === "PUT") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const place = await Place.findById(id);
    if (!place) return res.status(404).json({ error: "Not found" });
    if (place.userId && place.userId.toString() !== (decoded.id || decoded._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    const updated = await Place.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const place = await Place.findById(id);
    if (!place) return res.status(404).json({ error: "Not found" });
    if (place.userId && place.userId.toString() !== (decoded.id || decoded._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await Place.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.status(405).json({ error: "Method not allowed" });
}
