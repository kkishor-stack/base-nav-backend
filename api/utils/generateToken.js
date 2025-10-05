// utils/generateToken.js
import jwt from "jsonwebtoken";

export default function generateToken(payload) {
  // payload can be user id or object like { id, username }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}
