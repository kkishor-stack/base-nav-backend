// api/places/index.js
import dbConnect from "../../lib/dbconnect";
import Place from "../../models/Place";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const places = await Place.find({}).sort({ createdAt: -1 }).limit(500);
    return res.status(200).json(places);
  }

  if (req.method === "POST") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const data = { ...req.body, userId: decoded.id || decoded._id };
    const place = await Place.create(data);
    return res.status(201).json(place);
  }

  res.status(405).json({ error: "Method not allowed" });
}
