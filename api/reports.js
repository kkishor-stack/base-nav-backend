// api/reports.js
import jwt from "jsonwebtoken";
import dbConnect from "../lib/dbconnect.js";
import { Report } from "../models/ReportingHazards.js";

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
    const userId = req.user.id;
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    // Check for existing report or hazard within 5 meters
    // 5 meters = 5 / 6378137 (Earth radius in meters) in radians
    const maxDistance = 5; // meters
    // Check in both reports (pending/accepted) and hazardsverified
    const existingReport = await Report.findOne({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: maxDistance
        }
      },
      status: { $in: ["pending", "accepted"] }
    });
    // Import HazardsVerified model
    const { HazardsVerified } = await import("../models/ReportingHazards.js");
    const existingHazard = await HazardsVerified.findOne({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: maxDistance
        }
      },
      status: "accepted"
    });
    if (existingReport || existingHazard) {
      return res.status(409).json({
        error: "A hazard is already marked within 4-5 meters. Please upvote that hazard instead of creating a new report."
      });
    }
    // Create new report and auto-support by user
    const newReport = await Report.create({
      userId,
      type,
      description,
      location: {
        type: "Point",
        coordinates
      },
      status: "pending",
      approvedBy: [userId] // auto-support
    });
    return res.status(201).json({ message: "Report created", report: newReport });
  }

  if (req.method === "PUT") {
    // Voting logic: support/reject, only one vote per user, cannot vote on own report
    if (!id || !action) return res.status(400).json({ error: "ID and action required" });
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: "Not found" });

    const userId = req.user.id;
    // Prevent voting on own report
    if (String(report.userId) === String(userId)) {
      return res.status(403).json({ error: "You cannot vote on your own report." });
    }

    // Ensure arrays exist
    report.approvedBy = report.approvedBy || [];
    report.disapprovedBy = report.disapprovedBy || [];

    // Check if user already voted (support or reject)
    const alreadySupported = report.approvedBy.map(String).includes(String(userId));
    const alreadyRejected = report.disapprovedBy.map(String).includes(String(userId));
    if (alreadySupported && action === "support") {
      return res.status(409).json({ error: "You have already supported this report." });
    }
    if (alreadyRejected && action === "reject") {
      return res.status(409).json({ error: "You have already rejected this report." });
    }

    if (action === "support") {
      if (!alreadySupported) report.approvedBy.push(userId);
      report.disapprovedBy = report.disapprovedBy.filter(u => String(u) !== String(userId));
    } else if (action === "reject") {
      if (!alreadyRejected) report.disapprovedBy.push(userId);
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
