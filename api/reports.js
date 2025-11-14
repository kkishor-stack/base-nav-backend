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
    // if requesting only user's reports
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

    // support geo query: lat, lng, radius (meters)
    const { lat, lng, radius } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = radius ? parseInt(radius) : undefined;
    if (!isNaN(latNum) && !isNaN(lngNum) && radiusNum !== undefined && !isNaN(radiusNum)) {
      query.location = {
        $nearSphere: { $geometry: { type: "Point", coordinates: [lngNum, latNum] }, $maxDistance: radiusNum },
      };
    } else if (lat || lng || radius) {
      // some param provided but invalid
      return res.status(400).json({ error: "Invalid lat, lng, or radius" });
    }

    const reports = await Report.find(query);
    return res.status(200).json(reports);
  }

  if (req.method === "POST") {
    try {
      const { lat, lng, type, description } = req.body;
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid latitude or longitude" });
      }
      const userId = req.user.id;
      const coordinates = [parseFloat(lng), parseFloat(lat)];
      // Check for existing report or hazard within 5 meters
      const maxDistance = 5; // meters
      // Check in reports (pending/accepted)
      const existingReport = await Report.findOne({
        location: {
          $nearSphere: {
            $geometry: { type: "Point", coordinates },
            $maxDistance: maxDistance
          }
        },
        status: { $in: ["pending", "accepted"] }
      });
      // Import HazardsVerified model and check there as well
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
    } catch (err) {
      console.error("POST /api/reports error:", err);
      return res.status(500).json({ error: "Internal server error", details: err.message });
    }
  }

  if (req.method === "PUT") {
    // Voting logic: support/reject, only one vote per user, cannot vote on own report/hazard
    if (!id || !action) return res.status(400).json({ error: "ID and action required" });

    // Try to find the document in Report first
    let doc = await Report.findById(id);
    let source = "report";

    // If not found in reports, try HazardsVerified (same schema exported from ReportingHazards.js)
    if (!doc) {
      const { HazardsVerified } = await import("../models/ReportingHazards.js");
      doc = await HazardsVerified.findById(id);
      source = doc ? "hazard" : source;
    }

    if (!doc) return res.status(404).json({ error: "Not found" });

    const userId = req.user.id;
    // Prevent voting on own report/hazard
    if (String(doc.userId) === String(userId)) {
      return res.status(403).json({ error: "You cannot vote on your own report." });
    }

    // Ensure arrays exist
    doc.approvedBy = doc.approvedBy || [];
    doc.disapprovedBy = doc.disapprovedBy || [];

    // Check if user already voted (support or reject)
    const alreadySupported = doc.approvedBy.map(String).includes(String(userId));
    const alreadyRejected = doc.disapprovedBy.map(String).includes(String(userId));

    // Toggle behavior:
    // - If user clicks 'support' again and they already supported => remove their support (undo)
    // - If user clicks 'reject' again and they already rejected => remove their reject (undo)
    // - If user switches (support -> reject or reject -> support) update accordingly
    if (action === "support") {
      if (alreadySupported) {
        // undo support
        doc.approvedBy = doc.approvedBy.filter(u => String(u) !== String(userId));
      } else {
        // add support and remove any reject
        doc.approvedBy.push(userId);
        doc.disapprovedBy = doc.disapprovedBy.filter(u => String(u) !== String(userId));
      }
    } else if (action === "reject") {
      if (alreadyRejected) {
        // undo reject
        doc.disapprovedBy = doc.disapprovedBy.filter(u => String(u) !== String(userId));
      } else {
        // add reject and remove any support
        doc.disapprovedBy.push(userId);
        doc.approvedBy = doc.approvedBy.filter(u => String(u) !== String(userId));
      }
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await doc.save();

    // Check if report just reached 5+ supports and was promoted
    let wasPromoted = false;
    if (source === "report" && doc.approvedBy && doc.approvedBy.length >= 5) {
      // Verify middleware executed (check if also in HazardsVerified now)
      const { HazardsVerified } = await import("../models/ReportingHazards.js");
      const verifiedCopy = await HazardsVerified.findById(id).lean();
      wasPromoted = !!verifiedCopy;
    }

    // Return the updated document (with counts convenient for client)
    // Pull fresh copy from same collection
    let updatedDoc;
    if (source === "report") updatedDoc = await Report.findById(id).lean();
    else {
      const { HazardsVerified } = await import("../models/ReportingHazards.js");
      updatedDoc = await HazardsVerified.findById(id).lean();
    }

    return res.status(200).json({
      report: updatedDoc,
      source: wasPromoted ? "hazard" : source,
      wasPromoted: wasPromoted,
      counts: {
        support: (updatedDoc.approvedBy || []).length,
        reject: (updatedDoc.disapprovedBy || []).length
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
