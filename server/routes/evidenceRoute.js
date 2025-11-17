import express from "express";
import { addEvidence, getTaskEvidences } from "../controllers/evidenceController.js";
import upload from "../middlewares/uplMiddleware.js";

const evidenceRouter = express.Router();

// evidenceRouter.post('/', addEvidence);
evidenceRouter.post("/", upload.single("attachment"), addEvidence);
//evidenceRouter.get("/", getAllEvidence);
evidenceRouter.get("/:taskId/:weekIndex", getTaskEvidences);


// evidenceRouter.get("/:taskId", getTaskEvidences);

export default evidenceRouter