import dbConnect from "../lib/dbconnect";
import Route from "../models/Route";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    await dbConnect();

    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ error: "Invalid token" }); }
    }

    const { id, favorite } = req.query;

    if (req.method === "GET") {
        if (id) {
            const route = await Route.findById(id);
            if (!route) return res.status(404).json({ error: "Not found" });
            return res.status(200).json(route);
        } else {
            const { recent, fav } = req.query;
            const filter = { userId: req.user?.id };
            if (fav === "true") filter.isFavorite = true;
            const routes = await Route.find(filter).sort({ completedAt: -1 }).limit(recent ? 3 : 100);
            return res.status(200).json(routes);
        }
    }

    if (req.method === "POST") {
        const newRoute = await Route.create({ ...req.body, userId: req.user.id });
        return res.status(201).json(newRoute);
    }

    if (req.method === "PUT") {
        if (!id) return res.status(400).json({ error: "ID required" });
        const updated = await Route.findByIdAndUpdate(id, { isFavorite: favorite === "true" }, { new: true });
        return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
        if (!id) return res.status(400).json({ error: "ID required" });
        await Route.findByIdAndDelete(id);
        return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
