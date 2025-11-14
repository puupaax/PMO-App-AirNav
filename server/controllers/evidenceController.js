import prisma from "../config/prisma.js";

// Add evidence
export const addEvidence = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { keterangan, tanggal, taskId } = req.body;

        const file = req.file; // dari multer
        const image_url = file ? `/uploads/${file.filename}` : "";

        const task = await prisma.task.findUnique({
        where: { id: taskId },
        });

        if (!task) {
        return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        include: { members: true },
        });

        const member = project?.members.find((m) => m.userId === userId);
        if (!member) {
        return res.status(403).json({ message: "You are not a member of this project" });
        }

        const evidence = await prisma.evidence.create({
        data: {
            taskId,
            userId,
            content: keterangan,
            image_url,
            date: tanggal ? new Date(tanggal) : new Date(),
        },
        include: { user: true },
        });

        res.json({ message: "Evidence added successfully", evidence });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// Get evidences
// export const getTaskEvidences = async (req, res) => {
//     try {
//         const { taskId } = req.params;

//         const evidences = await prisma.evidence.findMany({
//             where: { taskId },
//             include: { user: true },
//             orderBy: { createdAt: "desc" },
//         });

//         res.json({ evidences });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: error.code || error.message });
//     }
// };
