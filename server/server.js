import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"

if (!process.env.CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk Publishable Key');
}

const app = express();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));


app.get('/', (req, res)=> res.send('Server is live'));
app.use("/api/inngest", serve({ client: inngest, functions }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
