// api/users/[id].js
import dbConnect from "../../lib/dbconnect";
import User from "../../models/User";
import verifyToken from "../verifyToken";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(user);
  }

  if (req.method === "PUT") {
    let decoded;
    try { decoded = verifyToken(req, res); } catch (e) { return; }
    if ((decoded.id || decoded._id) !== id) {
      return res.status(403).json({ error: "Not allowed" });
    }
    const update = req.body;
    if (update.password) delete update.password; // don't allow password change here
    const updated = await User.findByIdAndUpdate(id, update, { new: true }).select("-password");
    return res.status(200).json(updated);
  }

  res.status(405).json({ error: "Method not allowed" });
}
