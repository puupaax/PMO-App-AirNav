import prisma from "../config/prisma.js";

// Add Weekly Progress
export const addWeeklyProgress = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskId, weekIndex, date } = req.body;

        if (!taskId || weekIndex === undefined || !date) {
            return res.status(400).json({ message: "taskId, weekIndex, and date are required" });
        }

        // 1. Check task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // 2. Check project membership
        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: true },
        });

        const isMember = project.members.some(m => m.userId === userId);

        if (!isMember) {
            return res.status(403).json({ message: "You are not a member of this project" });
        }

        // 3. Create or Update WeeklyProgress
        const weekly = await prisma.weeklyProgress.upsert({
            where: {
                taskId_weekIndex: {
                    taskId,
                    weekIndex,
                },
            },
            update: {
                date: new Date(date),
            },
            create: {
                taskId,
                weekIndex,
                date: new Date(date),
            },
        });

        res.json({ 
            message: "Weekly progress saved", 
            weekly 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// Get weekly progress by task
export const getTaskWeeklyProgress = async (req, res) => {
    try {
        const { taskId } = req.params;

        const weeklyProgress = await prisma.weeklyProgress.findMany({
            where: { taskId },
            orderBy: { weekIndex: "asc" },
        });

        res.json({ weeklyProgress });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};
