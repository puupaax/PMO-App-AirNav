import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import evidenceRouter from './routes/evidenceRoute.js';
import weeklyRouter from './routes/weekproRoutes.js';

if (!process.env.CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk Publishable Key');
}

const app = express();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));
app.use("/uploads", express.static("uploads"));


app.get('/', (req, res)=> res.send('Server is live'));
app.use("/api/inngest", serve({ client: inngest, functions }));

//routes
app.use('/api/workspaces', protect, workspaceRouter)
app.use("/api/projects", protect, projectRouter)
app.use("/api/tasks", protect, taskRouter)
app.use("/api/comments", protect, commentRouter)
app.use("/api/evidences", protect, evidenceRouter)
app.use("/api/weekly-progress", protect, weeklyRouter)




const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
