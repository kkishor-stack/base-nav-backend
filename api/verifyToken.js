// api/verifyToken.js
import jwt from "jsonwebtoken";

export default function verifyToken(req, res) {
  const authHeader = req.headers?.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token missing" });
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Token missing" });
    throw new Error("Unauthorized");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded likely contains { id, iat, exp } depending how you signed it
    return decoded;
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
    throw new Error("Unauthorized");
  }
}
