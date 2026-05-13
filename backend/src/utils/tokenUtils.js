import jwt from "jsonwebtoken";
import { initConfig } from "../config/appConfig.js";

const { JWT_SECRET } = initConfig();

export function createToken(payload, expiresIn = "24h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
