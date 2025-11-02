// api/hazards/process.js
import dbConnect from "../../lib/dbconnect.js";
import { processPendingReports } from "./index.js";

export default async function handler(req, res) {
  await dbConnect();
  await processPendingReports();
  return res.status(200).json({ message: "Pending reports processed" });
}
