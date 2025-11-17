import prisma from "../config/prisma.js";


// ADD OR UPDATE EVIDENCE (same logic as weeklyProgress)
export const addEvidence = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { keterangan, tanggal, taskId, weekIndex } = req.body;

        if (!taskId || weekIndex === undefined || !tanggal) {
            return res.status(400).json({
                message: "taskId, weekIndex, and tanggal are required",
            });
        }

        const file = req.file;
        const image_url = file ? `/uploads/${file.filename}` : "";

        // 1. Check task
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

        const isMember = project.members.some((m) => m.userId === userId);

        if (!isMember) {
            return res.status(403).json({
                message: "You are not a member of this project",
            });
        }

        // 3. Upsert evidence (UPDATE jika week sudah ada, CREATE jika belum)
        const evidence = await prisma.evidence.create({
            data: {
                taskId,
                userId,
                content: keterangan,
                image_url,
                weekIndex: Number(weekIndex),
                date: new Date(tanggal),
            },
            include: { user: true },
        });


        res.json({
            message: "Evidence saved successfully",
            evidence,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// GET task evidence
export const getTaskEvidences = async (req, res) => {
  try {
    const { taskId, weekIndex } = req.params;

    const evidences = await prisma.evidence.findMany({
      where: {
        taskId,
        weekIndex: Number(weekIndex)
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { date: "asc" }
    });

    console.log("TASK:", taskId, "WEEK:", weekIndex);

    res.json(evidences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch evidences" });
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
