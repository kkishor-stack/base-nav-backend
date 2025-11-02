import dbConnect from "../lib/dbconnect.js";
import Place from "../models/Place.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    await dbConnect();

    if (["POST", "DELETE"].includes(req.method)) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "Invalid token" }); }
    }

    const { id } = req.query;

    if (req.method === "GET") {
        const places = await Place.find({ userId: req.user?.id });
        if (!places) return res.status(404).json({ error: "Not found" });
        return res.status(200).json(places);
    }

    if (req.method === "POST") {
        const newPlace = await Place.create({ ...req.body, userId: req.user.id });
        return res.status(201).json(newPlace);
    }

    if (req.method === "DELETE") {
        if (!id) return res.status(400).json({ error: "ID required" });
        const place = await Place.findByIdAndDelete(id);
        if (!place) return res.status(404).json({ error: "Not found" });
        return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
