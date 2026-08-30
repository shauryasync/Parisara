import { Router } from "express";
import { registerUser, loginUser } from "../controllers/userAuth.js";

const router = Router();

router.post("/register", registerUser);
router.get("/login", loginUser);

export { router };
