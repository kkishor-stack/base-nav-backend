// import dbConnect from "../lib/dbconnect";
// import Route from "../models/Route";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//     try {
//         await dbConnect();

//         const token = req.headers.authorization?.split(" ")[1];

//         if (["POST", "PUT", "DELETE"].includes(req.method)) {
//             // const token = req.headers.authorization?.split(" ")[1];
//             if (!token) return res.status(401).json({ error: "Unauthorized, No token" });
//             try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
//             catch { return res.status(401).json({ error: "Invalid token" }); }
//         }

//         const { id, favorite } = req.query;

//         if (req.method === "GET") {
//             // const token = req.headers.authorization?.split(" ")[1];
//             // if (!token) return res.status(401).json({ error: "Unauthorized" });

//             // try {
//             //     req.user = jwt.verify(token, process.env.JWT_SECRET);
//             // } catch {
//             //     return res.status(401).json({ error: "Invalid token" });
//             // }
//             if (id) {
//                 const route = await Route.findById(id).populate("hazardsEncountered");
//                 if (!route) return res.status(404).json({ error: "Not found" });
//                 return res.status(200).json(route);
//             } else {
//                 const { recent, fav } = req.query;
//                 const userId = req.user.id || req.user._id;
//                 const filter = { userId };
//                 if (fav === "true") filter.isFavorite = true;
//                 const routes = await Route.find(filter).populate("hazardsEncountered").sort({ completedAt: -1 }).limit(recent ? 3 : 100);
//                 return res.status(200).json(routes);
//             }
//         }

//         if (req.method === "POST") {
//             const userId = req.user.id || req.user._id;

//             // Validate body
//             if (!req.body.origin || !req.body.destination)
//                 return res.status(400).json({ error: "Origin and destination are required" });

//             if (
//                 req.body.origin.lat === undefined ||
//                 req.body.origin.lng === undefined ||
//                 req.body.destination.lat === undefined ||
//                 req.body.destination.lng === undefined
//             ) {
//                 return res.status(400).json({ error: "Latitude and longitude must be provided" });
//             }
//             const newRoute = await Route.create({ ...req.body, userId });
//             return res.status(201).json(newRoute);
//         }

//         if (req.method === "PUT") {
//             if (!id) return res.status(400).json({ error: "ID required" });
//             const updated = await Route.findByIdAndUpdate(id, { isFavorite: favorite === "true" }, { new: true });
//             if (!updated) return res.status(404).json({ error: "Route not found" });
//             return res.status(200).json(updated);
//         }

//         if (req.method === "DELETE") {
//             if (!id) return res.status(400).json({ error: "ID required" });
//             const deleted = await Route.findByIdAndDelete(id);
//             if (!deleted) return res.status(404).json({ error: "Route not found" });
//             return res.status(200).json({ message: "Deleted" });
//         }

//         return res.status(405).json({ error: "Method not allowed" });
//     } catch (error) {
//         console.error("Route API Error:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// }

// api/routes.js
import jwt from "jsonwebtoken";
import dbConnect from "../lib/dbconnect";
import Hazard from "../models/Hazard";
import Route from "../models/Route";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // -------------------- JWT Authentication --------------------
    const token = req.headers.authorization?.split(" ")[1];
    if (["POST", "PUT", "DELETE", "GET"].includes(req.method)) {
      if (!token) {
        console.log("No token provided");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
      }

      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        console.log("JWT payload:", req.user);
      } catch (err) {
        console.log("Invalid token:", err.message);
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    const { id, favorite } = req.query;

    // -------------------- GET --------------------
    if (req.method === "GET") {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        console.log("JWT payload missing id");
        return res.status(401).json({ error: "Unauthorized: User ID missing" });
      }

      if (id) {
        const route = await Route.findById(id).populate("hazardsEncountered");
        if (!route) return res.status(404).json({ error: "Route not found" });
        return res.status(200).json(route);
      } else {
        const { recent, fav } = req.query;
        const filter = { userId };
        if (fav === "true") filter.isFavorite = true;

        console.log("Fetching routes with filter:", filter, "recent:", recent);

        const routes = await Route.find(filter)
          .populate("hazardsEncountered")
          .sort({ completedAt: -1 })
          .limit(recent === "true" ? 3 : 100);
        console.log("Routes found:", routes.length);

        return res.status(200).json(routes);
      }
    }

    // -------------------- POST --------------------
    if (req.method === "POST") {
      const userId = req.user.id || req.user._id;
      console.log("Creating route for userId:", userId, "body:", req.body);

      if (!req.body.origin || !req.body.destination) {
        return res.status(400).json({ error: "Origin and destination required" });
      }
      if (
        req.body.origin.lat === undefined ||
        req.body.origin.lng === undefined ||
        req.body.destination.lat === undefined ||
        req.body.destination.lng === undefined
      ) {
        return res.status(400).json({ error: "Origin and destination must have lat/lng" });
      }

      const newRoute = await Route.create({ ...req.body, userId });
      console.log("Route created:", newRoute._id);
      return res.status(201).json(newRoute);
    }

    // -------------------- PUT --------------------
    if (req.method === "PUT") {
      if (!id) return res.status(400).json({ error: "ID required for update" });
      const updated = await Route.findByIdAndUpdate(
        id,
        { isFavorite: favorite === "true" },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Route not found" });
      return res.status(200).json(updated);
    }

    // -------------------- DELETE --------------------
    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "ID required for deletion" });
      const deleted = await Route.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: "Route not found" });
      return res.status(200).json({ message: "Deleted successfully" });
    }

    // -------------------- METHOD NOT ALLOWED --------------------
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Route API error:", err);
    return res.status(500).json({ error: { code: 500, message: "Server error", detail: err.message } });
  }
}
