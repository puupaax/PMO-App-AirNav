import React, { useMemo, useRef, useState, useEffect } from "react";
import { format, differenceInCalendarDays, addDays, startOfMonth, addMonths } from "date-fns";

// Status color map to match the sample image
const statusColors = {
    LATE: "#3b82f6", // blue
    OVERDUE: "#ef4444", // red
    UNDERWAY: "#fb923c", // orange
    DEFAULT: "#c7c7c7",
};

// Minimal Gantt-like chart component to replace calendar
const ProjectCalendar = ({ tasks = [], project = null }) => {
    // Build rows from tasks: each task becomes a row
    const rows = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];

        const today = new Date();

        return tasks.map((t) => {
            const title = t.title || `Task ${t.id}`;
            const end = t.due_date ? new Date(t.due_date) : null;
            // prefer project start_date, else task.createdAt, else estimate
            const startFromProject = project && project.start_date ? new Date(project.start_date) : null;
            const start = startFromProject || (t.createdAt ? new Date(t.createdAt) : (end ? addDays(end, -7) : addDays(today, -3)));

            // derive status from task.status and due date
            let status = "UNDERWAY";
            if (t.status === "DONE") status = "DEFAULT";
            else if (end && end < today) status = "OVERDUE";
            else if (end && end <= addDays(today, 7)) status = "LATE";

            return { name: title, start, end: end || addDays(start, 1), status };
        }).slice(0, 50); // cap rows for performance
    }, [tasks, project]);

    // Compute timeline range
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        if (!rows || rows.length === 0) {
            const s = new Date();
            return { timelineStart: s, timelineEnd: addDays(s, 7), totalDays: 7 };
        }
        let minD = rows[0].start || new Date();
        let maxD = rows[0].end || new Date();
        rows.forEach((r) => {
            if (r.start && r.start < minD) minD = r.start;
            if (r.end && r.end > maxD) maxD = r.end;
        });
        // add small padding
        minD = addDays(minD, -7);
        maxD = addDays(maxD, 7);
        const days = Math.max(1, differenceInCalendarDays(maxD, minD));
        return { timelineStart: minD, timelineEnd: maxD, totalDays: days };
    }, [rows]);

    // build month segments (each month will be displayed as 4 week-columns)
    const monthsAll = useMemo(() => {
        const start = startOfMonth(timelineStart);
        const m = [];
        let cursor = start;
        while (cursor <= timelineEnd) {
            m.push({ label: format(cursor, "MMMM yyyy"), monthStart: cursor });
            cursor = addMonths(cursor, 1);
        }
        return m;
    }, [timelineStart, timelineEnd]);

    // pagination/view settings
    const MONTHS_PER_PAGE = 12; // visible viewport shows 12 months width-wise
    // total columns for entire timeline (all months)
    const totalColumnsAll = monthsAll.length * 4;
    const totalColumns = totalColumnsAll; // we'll render all columns but viewport shows 12 months

    // build column date ranges for the full timeline (all months * 4) then slice the visible window
    const columnsAll = useMemo(() => {
        const allCols = Array.from({ length: monthsAll.length * 4 }).map((_, col) => {
            const startOffset = Math.round((col * totalDays) / (monthsAll.length * 4));
            const endOffset = Math.round(((col + 1) * totalDays) / (monthsAll.length * 4));
            const colStart = addDays(timelineStart, startOffset);
            const colEnd = addDays(timelineStart, endOffset);
            return { colStart, colEnd };
        });
        return allCols;
    }, [timelineStart, totalDays, monthsAll.length]);

    const visibleColumns = columnsAll; // render all columns, scrolling will show viewport of 12 months

    // grid sizing (pixels) — adjust to change compactness
    // We compute a responsive cell size so 12 months fill the card when possible.
    const MIN_CELL = 20; // minimum cell size in px
    const leftWidth = 160; // label column
    const rightWidth = 120; // date column on the right
    const [computedCellSize, setComputedCellSize] = useState(24);

    // drag-to-scroll refs
    const scrollerRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const containerRef = useRef(null);

    // compute responsive cell size so 12 months fit the visible card width when possible
    useEffect(() => {
        const el = scrollerRef.current || containerRef.current;
        if (!el) return;
        const resize = () => {
            const available = el.clientWidth - leftWidth - rightWidth; // pixels for cells in viewport
            const monthsToFit = Math.min(MONTHS_PER_PAGE, monthsAll.length);
            const maxCols = Math.max(1, monthsToFit * 4);
            const ideal = Math.floor(available / maxCols);
            setComputedCellSize(Math.max(MIN_CELL, ideal));
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [leftWidth, rightWidth, monthsAll.length]);

    // grid-based row renderer: returns grid cells in sequence (left label, N cells, right label)
    const renderRow = (row) => {
        const bg = statusColors[row.status] || statusColors.DEFAULT;
        return (
            <>
                <div style={{ padding: '6px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="text-sm text-zinc-700 dark:text-zinc-300">{row.name}</div>
                {visibleColumns.map((c, i) => {
                    const overlap = (row.start < c.colEnd) && (row.end > c.colStart);
                    return (
                        <div key={`${row.name}-c-${i}`} style={{ width: computedCellSize, height: computedCellSize, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                            <div style={{ width: '100%', height: '100%', background: overlap ? bg : 'transparent', borderRadius: 2 }} />
                        </div>
                    );
                })}
                <div style={{ padding: '6px 8px' }} className="text-xs text-zinc-500 dark:text-zinc-400 text-right">{format(row.start, 'MMM d')}</div>
            </>
        );
    };

    return (
        <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-zinc-900 dark:text-white text-md">Project Timeline</h2>
                    {/* viewport shows 12 months; no explicit pagination controls - user can drag/scroll */}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="w-3 h-3 rounded-full" style={{ background: statusColors.LATE }} /> Late
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="w-3 h-3 rounded-full" style={{ background: statusColors.OVERDUE }} /> Overdue
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="w-3 h-3 rounded-full" style={{ background: statusColors.UNDERWAY }} /> Underway
                    </div>
                </div>
            </div>

            <div
                style={{ overflowX: 'auto', cursor: 'grab' }}
                ref={scrollerRef}
                onMouseDown={(e) => {
                    isDraggingRef.current = true;
                    scrollerRef.current.classList.add('cursor-grabbing');
                    startXRef.current = e.pageX - scrollerRef.current.offsetLeft;
                    scrollLeftRef.current = scrollerRef.current.scrollLeft;
                }}
                onMouseMove={(e) => {
                    if (!isDraggingRef.current) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const x = e.pageX - scrollerRef.current.offsetLeft;
                    const walk = (x - startXRef.current) * 1; // scroll-fast multiplier
                    scrollerRef.current.scrollLeft = scrollLeftRef.current - walk;
                }}
                onMouseUp={() => {
                    isDraggingRef.current = false;
                    scrollerRef.current && scrollerRef.current.classList.remove('cursor-grabbing');
                }}
                onMouseLeave={() => {
                    isDraggingRef.current = false;
                    scrollerRef.current && scrollerRef.current.classList.remove('cursor-grabbing');
                }}
                onTouchStart={(e) => {
                    isDraggingRef.current = true;
                    startXRef.current = e.touches[0].pageX - scrollerRef.current.offsetLeft;
                    scrollLeftRef.current = scrollerRef.current.scrollLeft;
                }}
                onTouchMove={(e) => {
                    if (!isDraggingRef.current) return;
                    e.preventDefault(); // cegah halaman ikut geser di mobile
            e.stopPropagation();
                    const x = e.touches[0].pageX - scrollerRef.current.offsetLeft;
                    const walk = (x - startXRef.current) * 1;
                    scrollerRef.current.scrollLeft = scrollLeftRef.current - walk;
                }}
                onTouchEnd={() => { isDraggingRef.current = false; }}
            >
                <div ref={containerRef} style={{ minWidth: leftWidth + (totalColumns * computedCellSize) + rightWidth }}>
                    {/* Grid container: left label | repeated columns | right label */}
                    <div style={{ display: 'grid', gridTemplateColumns: `${leftWidth}px repeat(${totalColumns}, ${computedCellSize}px) ${rightWidth}px`, alignItems: 'center', gap: 0 }}>
                        {/* months header (each spans 4 columns) */}
                        <div />
                        {monthsAll.map((m, mi) => (
                            <div key={mi} style={{ gridColumn: `span 4`, textAlign: 'center', padding: '6px 4px', fontWeight: 600 }} className="text-zinc-700 dark:text-zinc-300">{format(m.monthStart, 'MMM yyyy')}</div>
                        ))}
                        <div />

                        {/* week labels row */}
                        <div />
                        {monthsAll.map((m, mi) => (
                            ['I', 'II', 'III', 'IV'].map((wk, wi) => (
                                <div key={`${mi}-${wi}`} style={{ width: computedCellSize, height: computedCellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }} className="text-zinc-500 dark:text-zinc-400">{wk}</div>
                            ))
                        ))}
                        <div />

                        {/* rows area: render each row as sequential grid children */}
                        {rows.length === 0 ? (
                            <>
                                <div />
                                {Array.from({ length: totalColumns }).map((_, i) => <div key={i} style={{ width: computedCellSize, height: computedCellSize, borderRight: '1px solid rgba(0,0,0,0.06)' }} />)}
                                <div />
                                <div style={{ gridColumn: `1 / ${totalColumns + 3}` }} className="py-8 text-center text-zinc-600 dark:text-zinc-400">No tasks available to build the timeline.</div>
                            </>
                        ) : (
                            rows.map((r, idx) => (
                                <React.Fragment key={r.name || idx}>
                                    {renderRow(r)}
                                </React.Fragment>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCalendar;
