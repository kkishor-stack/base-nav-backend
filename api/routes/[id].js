// api/routes/[id].js
import dbConnect from "../../lib/dbconnect";
import RouteModel from "../../models/Route";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const route = await RouteModel.findById(id);
    if (!route) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(route);
  }

  if (req.method === "DELETE") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const route = await RouteModel.findById(id);
    if (!route) return res.status(404).json({ error: "Not found" });

    if (route.userId.toString() !== (decoded.id || decoded._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await RouteModel.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.status(405).json({ error: "Method not allowed" });
}
