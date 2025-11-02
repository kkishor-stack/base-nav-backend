import dbConnect from "../../lib/dbconnect.js";
import User from "../../models/User.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnect();

  // Get token
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const userId = decoded.id;

  if (req.method === "PUT") {
    const { recentRoutes } = req.body;
    if (!recentRoutes || !Array.isArray(recentRoutes))
      return res.status(400).json({ error: "recentRoutes must be an array" });

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { recentRoutes: recentRoutes.slice(0, 3) }, // max 3
        { new: true }
      );
      return res.status(200).json({ recentRoutes: user.recentRoutes });
    } catch (err) {
      return res.status(500).json({ error: "DB update failed", details: err.message });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
