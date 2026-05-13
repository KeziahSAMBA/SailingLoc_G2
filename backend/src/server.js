import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import boatRoutes from "./routes/boatRoutes.js";
import { initConfig } from "./config/appConfig.js";

dotenv.config();
const { PORT } = initConfig();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/api/boats", boatRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
