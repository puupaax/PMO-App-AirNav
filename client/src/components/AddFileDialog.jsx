import { useState } from "react";
import { Paperclip, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";

export default function AddFileDialog({ showDialog, setShowDialog, taskId, getWeekIndexForDate, visibleColumns, onSuccess }) {
    const { getToken } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        tanggal: "",
        keterangan: "",
        attachment: null,
    });

    const handleFileChange = (e) => {
        setFormData({ ...formData, attachment: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const dataToSend = new FormData();
            dataToSend.append("tanggal", formData.tanggal);
            dataToSend.append("keterangan", formData.keterangan);
            dataToSend.append("taskId", taskId);
            const weekIndex = getWeekIndexForDate(new Date(formData.tanggal), visibleColumns);

            await api.post("/api/weekly-progress", {
                taskId,
                weekIndex,
                date: formData.tanggal},
            {
                headers: { Authorization: `Bearer ${token}` }
            });

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

            if (typeof onSuccess === "function") onSuccess();

            setShowDialog(false);
            setFormData({ tanggal: "", keterangan: "", attachment: null });
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return showDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 text-zinc-900 dark:text-white">
            <h2 className="text-xl font-bold mb-4">Attach Evidence</h2>

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
                    onChange={handleFileChange}
                    className="text-sm text-zinc-700 dark:text-zinc-300"
                />
                </div>
                {formData.attachment && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Selected: {formData.attachment.name}
                </p>
                )}
            </div>

            {/* Keterangan */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Keterangan</label>
                <textarea
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Tambahkan keterangan tambahan..."
                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm mt-1 h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
                <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={isSubmitting}
                className="rounded px-5 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white dark:text-zinc-200 transition"
                >
                {isSubmitting ? "Saving..." : "Save Detail"}
                </button>
            </div>
            </form>
        </div>
        </div>
    ) : null;
}
