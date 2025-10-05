// api/reports/index.js
import dbConnect from "../../lib/dbconnect";
import Report from "../../models/Report";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const { bounds } = req.query; // optional bounds filter
    // For simplicity return all active reports
    const reports = await Report.find({ status: "active" }).sort({ reportedAt: -1 }).limit(500);
    return res.status(200).json(reports);
  }

  if (req.method === "POST") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    const data = { ...req.body, user: decoded.id || decoded._id };
    const report = await Report.create(data);
    return res.status(201).json(report);
  }

  res.status(405).json({ error: "Method not allowed" });
}
