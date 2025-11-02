import dbConnect from "../lib/dbconnect.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnect();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  let userId;
  try { userId = jwt.verify(token, process.env.JWT_SECRET).id; }
  catch { return res.status(401).json({ error: "Invalid token" }); }

  const { id } = req.query;
  if (id !== userId) return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const user = await User.findById(id).select("-password");
    return res.status(200).json(user);
  }

  if (req.method === "PUT") {
    const updated = await User.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
