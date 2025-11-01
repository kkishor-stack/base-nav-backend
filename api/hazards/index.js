// api/hazards.js
import jwt from "jsonwebtoken";
import dbConnect from "../../lib/dbconnect";
import Hazard from "../../models/Hazard";
import Report from "../../models/Report";

async function verifyReportWithML(report) {
    // Placeholder — later integrate ML or manual check logic
    // e.g. send to model API, or queue for moderation
    return Math.random() > 0.3; // temporary random verification (70% chance)
}

// Move verified reports to hazards
async function processPendingReports() {
    const pendingReports = await Report.find({ status: "pending" });

    for (const report of pendingReports) {
        const verified = await verifyReportWithML(report);
        if (!verified) continue;

        await Hazard.create({
            userId: report.userId, // keep this consistent with your Hazard model
            reportedBy: report.userId,
            type: report.type,
            severity: "moderate", // or derive later from ML
            description: report.details,
            location: report.location,
            active: true,
        });

        report.status = "verified";
        await report.save();
    }
}

export default async function handler(req, res) {
    await dbConnect();

    // JWT check for POST/PUT/DELETE
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "Invalid token" }); }
    }

    const { id } = req.query;
    // const { id, origin, destination } = req.query;

    if (req.method === "GET") {
        if (id) {
            const hazard = await Hazard.findById(id);
            if (!hazard) return res.status(404).json({ error: "Not found" });
            return res.status(200).json(hazard);
        }

        if (req.query.mine === "true") {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) return res.status(401).json({ error: "Unauthorized" });

            try {
                const user = jwt.verify(token, process.env.JWT_SECRET);
                const hazards = await Hazard.find({ userId: user.id });
                return res.status(200).json(hazards);
            } catch {
                return res.status(401).json({ error: "Invalid token" });
            }
        }

        let query = { active: true }; // Start with a default filter for active hazards

        const { lat, lng, radius = 50 } = req.query;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseInt(radius);

        if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(radiusNum)) {
            query.location = {
                $nearSphere: { $geometry: { type: "Point", coordinates: [lngNum, latNum] }, $maxDistance: radiusNum },
            };
        } else if (lat || lng || radius) {

            return res.status(400).json({ error: "Invalid lat, lng, or radius" });
        }

        // const token = req.headers.authorization?.split(" ")[1];
        // if (token) {
        //     try {
        //         const user = jwt.verify(token, process.env.JWT_SECRET);
        //         if (req.query.mine === "true") {
        //             query.reportedBy = user.id;
        //         }
        //     } catch {
        //         /* ignore invalid token for GET */
        //     }
        // }

        const hazards = await Hazard.find(query);
        return res.status(200).json(hazards);

    }

    if (req.method === "POST") {
        // if (origin && destination) {
        //     // TODO: hazards along route
        //     return res.status(200).json([]);
        // }
        // const { lat, lng, type, severity, description, images, expiresAt } = req.body;
        // const latNum = parseFloat(lat);
        // const lngNum = parseFloat(lng);

        // if (isNaN(latNum) || isNaN(lngNum)) {
        //     return res.status(400).json({ error: "Invalid lat or lng" });
        // }
        // const userId = req.user.id || req.user._id; // or req.user._id if using Mongo ObjectId

        // const newReport = await Report.create({
        //     user: userId,
        //     type,
        //     details: description,
        //     location: { type: "Point", coordinates: [lngNum, latNum] },
        //     status: "pending",
        // });

        // STEP 2️⃣: (Optional placeholder) — automatic verification later
        // Uncomment later when ML or manual verification is ready
        /*
        const verified = await verifyReportWithML(newReport);
        if (verified) {
          await Hazard.create({
            userId: userId,
            reportedBy: userId,
            type,
            severity,
            description,
            images,
            expiresAt,
            location: { type: "Point", coordinates: [lngNum, latNum] },
          });
        }
        */

        // return res.status(201).json({
        //     message: "Report created", report: newReport,
        // });
        return res.status(405).json({ error: "Hazards are not created directly. Submit via /api/reports first." });

    }

    if (req.method === "PUT") {
        if (!id) return res.status(400).json({ error: "ID required" });
        if (req.body.lat !== undefined && req.body.lng !== undefined) {
            const latNum = parseFloat(req.body.lat);
            const lngNum = parseFloat(req.body.lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
                req.body.location = { type: "Point", coordinates: [lngNum, latNum] };
            }
            delete req.body.lat;
            delete req.body.lng;
        }
        const updated = await Hazard.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
        if (!id) return res.status(400).json({ error: "ID required" });
        await Hazard.findByIdAndDelete(id);
        return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export async function processHandler(req, res) {
    await dbConnect();
    await processPendingReports();
    return res.status(200).json({ message: "Pending reports processed" });
}