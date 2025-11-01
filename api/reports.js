// api/reports.js
import dbConnect from "../lib/dbconnect";
import Report from "../models/Report";
import jwt from "jsonwebtoken";

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
    // const { bounds } = req.query;
    // const reports = await Report.find(bounds ? { location: { $geoWithin: { $geometry: JSON.parse(bounds) } } } : {});
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
    // const newReport = await Report.create({ ...req.body, reportedBy: req.user.id });
    return res.status(201).json({ message: "Report created", report: newReport });
  }

  if (req.method === "PUT") {
    if (!id || !action) return res.status(400).json({ error: "ID and action required" });
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: "Not found" });

    if (action === "confirm") {
      if (!report.confirmedBy.includes(req.user.id)) report.confirmedBy.push(req.user.id);
    } else if (action === "deny") {
      if (!report.deniedBy.includes(req.user.id)) report.deniedBy.push(req.user.id);
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
    // if (report.confirmedBy.length >= 3) report.status = "verified";

    await report.save();
    return res.status(200).json(report);
  }

  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "ID required" });
    await Report.findByIdAndDelete(id);
    return res.status(200).json({ message: "Deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
