import { Router } from "express";
import { registerUser } from "../controllers/userAuth.js";

const router = Router();

router.post("/register", registerUser);

export { router };
