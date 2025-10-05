// api/routes/index.js
import dbConnect from "../../lib/dbconnect";
import RouteModel from "../../models/Route";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    // If token provided, return the user's 3 most recent routes
    try {
      const { recent } = req.query;
      const tokenProvided = !!req.headers.authorization;
      if (tokenProvided) {
        let decoded;
        try { decoded = verifyToken(req, res); } catch (e) { return; }
        const userId = decoded.id || decoded._id;
        if (recent === "true") {
          const recentRoutes = await RouteModel.find({ userId }).sort({ completedAt: -1 }).limit(3);
          return res.status(200).json(recentRoutes);
        } else {
          const routes = await RouteModel.find({ userId }).sort({ completedAt: -1 }).limit(50);
          return res.status(200).json(routes);
        }
      } else {
        // no token -> return public routes (or none)
        const publicRoutes = await RouteModel.find({}).sort({ completedAt: -1 }).limit(50);
        return res.status(200).json(publicRoutes);
      }
    } catch (err) {
      console.error("routes GET error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    // Save a user's completed route (protected)
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    try {
      const userId = decoded.id || decoded._id;
      const data = { ...req.body, userId };
      const route = await RouteModel.create(data);
      return res.status(201).json(route);
    } catch (err) {
      console.error("routes POST error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
