import { useState, useEffect } from "react";
import { Paperclip, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import { BeatLoader } from "react-spinners";


export default function AddFileDialog({ showDialog, setShowDialog, taskId, getWeekIndexForDate, visibleColumns, taskName, selectedWeekIndex, weekIndexOnClick, onSuccess }) {
    const { getToken } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evidences, setEvidences] = useState([]);
    const [loading, setLoading] = useState(false);


    
    const [formData, setFormData] = useState({
        tanggal: "",
        keterangan: "",
        attachment: null,
    });

    // ⬇️ Fetch evidence saat dialog dibuka
    useEffect(() => {
        if (!showDialog || weekIndexOnClick === null) return;
        fetchEvidences(weekIndexOnClick);
    }, [showDialog, weekIndexOnClick]);


    const fetchEvidences = async (weekIndex) => {
        try {
            if (weekIndex == null) return; // jangan fetch kalau undefined/null

            setLoading(true);

            const token = await getToken();
            const { data } = await api.get(`/api/evidences/${taskId}/${weekIndex}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setEvidences(data);
        } catch (error) {
            console.error(error);
        }finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const dataToSend = new FormData();
            //const week = selectedWeekIndex;
            dataToSend.append("tanggal", formData.tanggal);
            dataToSend.append("keterangan", formData.keterangan);
            dataToSend.append("taskId", taskId);
            const weekIndex = getWeekIndexForDate(new Date(formData.tanggal), visibleColumns);
            console.log("weekIndexEvidence:", weekIndex);
            console.log("weekIndexEvidence2:", selectedWeekIndex);
            await api.post("/api/weekly-progress", {
                taskId,
                weekIndex,
                date: formData.tanggal},
            {
                headers: { Authorization: `Bearer ${token}` }
            });

            dataToSend.append("weekIndex", weekIndex);

            if (formData.attachment) dataToSend.append("attachment", formData.attachment);

            const { data } = await api.post(`/api/evidences`, dataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            // await api.post(`/api/weekly-progress`, {
            //     taskId,
            //     progress: 100,
            //     weekStart,
            //     weekEnd,
            // }, {
            //     headers: { Authorization: `Bearer ${token}` }
            // });


            toast.success(data.message || "Evidence added successfully");

            fetchEvidences(weekIndex); // ⬅️ refresh list setelah upload

            setFormData({ tanggal: "", keterangan: "", attachment: null });
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return showDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur" onClick={() => setShowDialog(false)}>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 text-zinc-900 dark:text-white" onClick={(e) => e.stopPropagation()}>

                <h2 className="text-xl font-bold mb-4">Tambah Evidence <span className="text-blue-500">{taskName} </span>minggu ke-<span>{weekIndexOnClick}</span></h2>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tanggal */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Tanggal</label>
                        <div className="flex items-center gap-2">
                            <Calendar className="size-5 text-zinc-500 dark:text-zinc-400" />
                            <input
                                type="date"
                                value={formData.tanggal}
                                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm mt-1"
                            />
                        </div>
                    </div>

                    {/* Attachment */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Attachment</label>
                        <div className="flex items-center gap-2">
                            <Paperclip className="size-5 text-zinc-500 dark:text-zinc-400" />
                            <input
                                type="file"
                                onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                                className="text-sm text-zinc-700 dark:text-zinc-300"
                            />
                        </div>
                    </div>

                    {/* Keterangan */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Keterangan</label>
                        <textarea
                            value={formData.keterangan}
                            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                            className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm h-20"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowDialog(false)}
                            className="rounded border px-5 py-2 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded px-5 py-2 text-sm bg-blue-600 text-white"
                        >
                            {isSubmitting ? "Saving..." : "Save Detail"}
                        </button>
                    </div>
                </form>

                {/* LINE DIVIDER */}
                <div className="border-t my-4 border-zinc-700/50" />

                {/* EVIDENCE LIST → berada di bawah form */}
                <div>
                    <h3 className="font-semibold mb-2">
                        Evidences <span className="text-blue-500">{taskName} </span>
                        minggu ke-<span>{weekIndexOnClick}</span>
                    </h3>
                    
                    {evidences.length === 0 ? (
                        <p className="text-sm text-zinc-500">Belum ada evidence.</p>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {evidences.map((ev) => (
                                <div key={ev.id} className="p-3 border rounded dark:border-zinc-700">
                                    <p className="text-sm font-medium">Diupload Oleh: {ev.user?.name}</p>
                                    <p className="text-xs text-zinc-400">
                                        Evidence tanggal: {new Date(ev.date).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </p>

                                    <p className="text-xs text-zinc-400">
                                        Diupload pada: {new Date(ev.createdAt).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </p>
                                    
                                    <p className="text-sm mt-1">Keterangan: {ev.content}</p>

                                    {ev.image_url && (
                                        <a
                                            href={`${import.meta.env.VITE_BASEURL}${ev.image_url}`}
                                            target="_blank"
                                            className="text-blue-500 text-sm underline mt-1 block"
                                        >
                                            Lihat File
                                        </a>
                                    )}
                                    
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;
}
