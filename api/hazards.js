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
        } else {
            const { lat, lng, radius = 50 } = req.query;
            const hazards = await Hazard.find({
                location: {
                    $nearSphere: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: parseInt(radius) },
                },
            });
            return res.status(200).json(hazards);
        }
    }

    if (req.method === "POST") {
        if (origin && destination) {
            // TODO: hazards along route
            return res.status(200).json([]);
        }
        const newHazard = await Hazard.create({ ...req.body, reportedBy: req.user.id });
        return res.status(201).json(newHazard);
    }

    if (req.method === "PUT") {
        if (!id) return res.status(400).json({ error: "ID required" });
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
