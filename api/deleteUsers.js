import dbConnect from "../lib/dbconnect";
import User from "../models/User";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "DELETE") {
    const { age } = req.body;

    const result = await User.deleteMany({ age: { $lt: age } });
    return res.status(200).json({ deletedCount: result.deletedCount });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
