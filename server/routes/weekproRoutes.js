import express from "express";
import { addWeeklyProgress, getTaskWeeklyProgress } from "../controllers/weekproController.js";


const weeklyRouter = express.Router();

weeklyRouter.post("/", addWeeklyProgress);
weeklyRouter.get("/:taskId", getTaskWeeklyProgress);

export default weeklyRouter;
