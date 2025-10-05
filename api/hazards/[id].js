// api/hazards/[id].js
import dbConnect from "../../lib/dbconnect";
import Hazard from "../../models/Hazard";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const hazard = await Hazard.findById(id);
    if (!hazard) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(hazard);
  }

  if (req.method === "PUT") {
    // optional: protected, but we allow update only if reporter or authenticated
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }

    const hazard = await Hazard.findById(id);
    if (!hazard) return res.status(404).json({ error: "Not found" });

    // if you want: check ownership: hazard.reportedBy.toString() === decoded.id
    // For now allow any authenticated user to update certain fields:
    const updatable = (({ type, severity, description, active, expiresAt, images }) => ({ type, severity, description, active, expiresAt, images }))(req.body);
    Object.assign(hazard, updatable);
    await hazard.save();
    return res.status(200).json(hazard);
  }

  if (req.method === "DELETE") {
    // Protected: only reporter or authenticated users can delete
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }

    const hazard = await Hazard.findById(id);
    if (!hazard) return res.status(404).json({ error: "Not found" });

    // ownership check (recommended)
    if (hazard.reportedBy && hazard.reportedBy.toString() !== (decoded.id || decoded._id)) {
      // if not owner, deny (you can change to allow admins)
      return res.status(403).json({ error: "Not allowed" });
    }

    await Hazard.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.status(405).json({ error: "Method not allowed" });
}
