// api/reports.js
import jwt from "jsonwebtoken";
import dbConnect from "../lib/dbconnect.js";
import Report from "../models/Report.js";

export default async function handler(req, res) {
  await dbConnect();

  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ error: "Invalid token" }); }
  }

  const { id, action, mine } = req.query;

  if (req.method === "GET") {
    let query = {};
    if (mine === "true") {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        query.userId = user.id;
      } catch {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    const reports = await Report.find(query);
    return res.status(200).json(reports);
  }

  if (req.method === "POST") {

    const { lat, lng, type, description } = req.body;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    const newReport = await Report.create({
      userId: req.user.id,
      type,
      description,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      status: "pending",
    });
    return res.status(201).json({ message: "Report created", report: newReport });
  }

  if (req.method === "PUT") {
    // Changed: support/reject actions that toggle user's impression and ensure one impression per user
    if (!id || !action) return res.status(400).json({ error: "ID and action required" });
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: "Not found" });

    // Ensure arrays exist
    report.approvedBy = report.approvedBy || [];
    report.disapprovedBy = report.disapprovedBy || [];

    const userId = req.user.id;

    if (action === "support") {
      // Add to approvedBy if not present, remove from disapprovedBy
      if (!report.approvedBy.map(String).includes(String(userId))) report.approvedBy.push(userId);
      report.disapprovedBy = report.disapprovedBy.filter(u => String(u) !== String(userId));
    } else if (action === "reject") {
      if (!report.disapprovedBy.map(String).includes(String(userId))) report.disapprovedBy.push(userId);
      report.approvedBy = report.approvedBy.filter(u => String(u) !== String(userId));
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await report.save();

    // Return the updated report (with counts convenient for client)
    const updatedReport = await Report.findById(id).lean();
    return res.status(200).json({
      report: updatedReport,
      counts: {
        support: (updatedReport.approvedBy || []).length,
        reject: (updatedReport.disapprovedBy || []).length
      }
    });
  }

  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "ID required" });
    await Report.findByIdAndDelete(id);
    return res.status(200).json({ message: "Deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
