import dbConnect from "../lib/dbconnect";
import Hazard from "../models/Hazard";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    await dbConnect();

    // JWT check for POST/PUT/DELETE
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "Invalid token" }); }
    }

    const { id, origin, destination } = req.query;

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
                const hazards = await Hazard.find({ reportedBy: user.id });
                return res.status(200).json(hazards);
            } catch {
                return res.status(401).json({ error: "Invalid token" });
            }
        }
        const { lat, lng, radius = 50 } = req.query;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseInt(radius);

        if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) return res.status(400).json({ error: "Invalid lat, lng, or radius" });

        const query = {
            location: {
                $nearSphere: { $geometry: { type: "Point", coordinates: [lngNum, latNum] }, $maxDistance: radiusNum },
            },
        };
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            try {
                const user = jwt.verify(token, process.env.JWT_SECRET);
                if (req.query.mine === "true") {
                    query.reportedBy = user.id;
                }
            } catch {
                /* ignore invalid token for GET */
            }
        }

        const hazards = await Hazard.find(query);
        return res.status(200).json(hazards);

    }

    if (req.method === "POST") {
        if (origin && destination) {
            // TODO: hazards along route
            return res.status(200).json([]);
        }
        const { lat, lng, type, severity, description, images, expiresAt } = req.body;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            return res.status(400).json({ error: "Invalid lat or lng" });
        }
        const newHazard = await Hazard.create({
            reportedBy: req.user.id, type, severity, description, images, expiresAt, location: { type: "Point", coordinates: [lngNum, latNum] },
        });
        return res.status(201).json(newHazard);
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
