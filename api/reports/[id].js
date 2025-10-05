// api/reports/[id].js
import dbConnect from "../../lib/dbconnect";
import Report from "../../models/Report";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const report = await Report.findById(id).populate("user", "username email");
    if (!report) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(report);
  }

  if (req.method === "DELETE") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: "Not found" });
    if (report.user && report.user.toString() !== (decoded.id || decoded._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await Report.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.status(405).json({ error: "Method not allowed" });
}
