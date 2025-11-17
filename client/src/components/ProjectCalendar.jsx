import React, { useMemo, useRef, useState, useEffect } from "react";
import { format, differenceInCalendarDays, addDays, startOfMonth, addMonths } from "date-fns";
import AddFileDialog from "./AddFileDialog.jsx";

// Status color map to match the sample image
const statusColors = {
    LATE: "#3b82f6", // blue
    OVERDUE: "#ef4444", // red
    UNDERWAY: "#fb923c", // orange
    DEFAULT: "#c7c7c7",
};

// Minimal Gantt-like chart component to replace calendar
const ProjectCalendar = ({ tasks = [], project }) => {
    // console.log("ProjectCalendar project end_date =", project.end_date);
    console.log("tasks start date =", tasks);

    // Build rows from tasks: each task becomes a row
    const rows = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];

        const today = new Date();

        return tasks.map((t) => {
            const title = t.title || `Task ${t.id}`;
            const end = t.end_date ? new Date(t.end_date) : null;
            // const due = t.due_date ? new Date(t.due_date) : null;
            // prefer project start_date, else task.createdAt, else estimate
            const startFromProject = project && project.start_date ? new Date(project.start_date) : null;
            const start = (t.start_date ? new Date(t.start_date) : (end ? addDays(end, -7) : addDays(today, -3)));

            // derive status from task.status and due date
            let status = "UNDERWAY";
            if (t.status === "DONE") status = "DEFAULT";
            else if (end && end < today) status = "OVERDUE";
            else if (end && end <= addDays(today, 7)) status = "LATE";

            return { id: t.id, name: title, start, end: end || addDays(start, 1), status };
        }).slice(0, 50); // cap rows for performance
    }, [tasks, project]);

    // Compute timeline range
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        if (!rows || rows.length === 0) {
            //const s = new Date();
            const s = project?.start_date ? new Date(project.start_date) : new Date();
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
        const cols = [];
        monthsAll.forEach((m) => {
            const monthStart = m.monthStart;
            const monthEnd = addMonths(monthStart, 1); // exclusive end of month
            // jumlah hari pada bulan (differenceInCalendarDays monthEnd - monthStart)
            const daysInMonth = Math.max(1, differenceInCalendarDays(monthEnd, monthStart));
            const base = Math.floor(daysInMonth / 4);
            const remainder = daysInMonth % 4;
            // distribute remainder to the first segments so total days match the month
            let offset = 0;
            for (let seg = 0; seg < 4; seg++) {
                // give one extra day to first remainder segments
                const segLen = base + (seg < remainder ? 1 : 0);
                const colStart = addDays(monthStart, offset);
                const colEnd = addDays(colStart, segLen); // exclusive end
                cols.push({ colStart, colEnd, month: format(monthStart, 'MMM yyyy'), segment: seg });
                offset += segLen;
            }
            // safety: ensure last segment ends exactly at monthEnd
            if (cols.length > 0) {
                const last = cols[cols.length - 1];
                if (differenceInCalendarDays(last.colEnd, monthEnd) !== 0) {
                    last.colEnd = monthEnd;
                }
            }
        });
        return cols;
    }, [monthsAll]);
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
    // useEffect(() => {
    //     const el = scrollerRef.current || containerRef.current;
    //     if (!el) return;

    //     const calc = () => {
    //         // gunakan boundingRect agar akurat & update realtime
    //         const rect = el.getBoundingClientRect();
    //         const available = Math.max(0, rect.width - leftWidth - rightWidth);

    //         const monthsToFit = Math.min(MONTHS_PER_PAGE, monthsAll.length);
    //         const maxCols = Math.max(1, monthsToFit * 4);
    //         const ideal = Math.floor(available / maxCols);

    //         setComputedCellSize(Math.max(MIN_CELL, ideal));
    //     };

    //     // observer untuk detect resize pada container
    //     const ro = new ResizeObserver(calc);
    //     ro.observe(el);

    //     // hitung awal
    //     calc();

    //     return () => ro.disconnect();
    // }, [monthsAll.length]);


    // const [selectedTask, setSelectedTask] = useState(null);

    const [selectedCell, setSelectedCell] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTaskForDialog, setSelectedTaskForDialog] = useState(null);
    // const [completedTasks, setCompletedTasks] = useState([]);
    const [completedCells, setCompletedCells] = useState([]);
    const [selectedColForDialog, setSelectedColForDialog] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(null);

    // const getWeekIndexFromColumn = (colIndex) => {
    //     return colIndex; // week index = index kolom
    // };


    const getWeekIndexForDate = (selectedDate) => {
        for (let i = 0; i < visibleColumns.length; i++) {
            const col = visibleColumns[i];
            if (selectedDate >= col.colStart && selectedDate < col.colEnd) {
                return i;
            }
        }
        if (selectedDate < visibleColumns[0].colStart) return 0;
        return visibleColumns.length - 1;
    };

    const renderRow = (row) => {
        // const isSelected = selectedTask?.name === row.name;
        // const bg = isSelected ? "#22c55e" : (statusColors[row.status] || statusColors.DEFAULT);

        return (
            <>
                <div
                    style={{ padding: '6px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                    className="text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                    // onClick={() => setSelectedTask((prev) => prev?.name === row.name ? null : row)}
                >
                    {row.name}
                </div>
                {visibleColumns.map((c, i) => {
                    const overlap = (row.start < c.colEnd) && (row.end > c.colStart);

                    // const isSelected =
                    //     selectedCell?.task === row.name && selectedCell?.col === i;
                    const isSelected = selectedCell.some(
                        (sel) => sel.task === row.name && sel.col === i
                    );

                    // const bg = isSelected
                    //     ? "#22c55e"
                    //     : (overlap ? (statusColors[row.status] || statusColors.DEFAULT) : "transparent");

                    // const isCompleted = completedTasks.includes(row.id);
                    const isCompleted = completedCells.some(
                        (cell) => cell.taskId === row.id && cell.col === i
                    );

                    const bg = isCompleted
                    ? "#22c55e" 
                    : isSelected
                        ? "#86efac" 
                        : (overlap ? (statusColors[row.status] || statusColors.DEFAULT) : "transparent");

                    return (
                        <div
                            key={`${row.name}-c-${i}`}
                            style={{
                                width: computedCellSize,
                                height: computedCellSize,
                                borderRight: '1px solid rgba(0,0,0,0.06)',
                                cursor: overlap ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                                if (!overlap) return;

                                //Simpan weekIndex
                                setSelectedWeekIndex(i);
                                setSelectedColForDialog(i);

                                setIsDialogOpen(true);

                                setSelectedCell((prev) => {
                                    const exists = prev.some(
                                        (sel) => sel.task === row.name && sel.col === i
                                    );
                                    if (exists) {
                                        return prev.filter(
                                            (sel) => !(sel.task === row.name && sel.col === i)
                                        );
                                    } else {
                                        return [...prev, { task: row.name, col: i }];
                                    }
                                });
                                const weekIndex = getWeekIndexForDate(new Date());
                                setSelectedWeek({ weekIndex });

                                setSelectedTaskForDialog(row);
                                setSelectedColForDialog(i);
                                // const selectedColumn = visibleColumns[i];
                                setIsDialogOpen(true);
                            }}
                            
                        >
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: bg,
                                    borderRadius: 2,
                                    transition: "background 0.2s ease",
                                }}
                            />
                        </div>
                    );
                    
                })}

                <div style={{ padding: '6px 8px' }} className="text-xs text-zinc-500 dark:text-zinc-400 text-right">
                    {format(row.end, 'MMM d')}
                </div>
            </>
        );
    };

    // grid-based row renderer: returns grid cells in sequence (left label, N cells, right label)
    // const renderRow = (row) => {
    //     const bg = statusColors[row.status] || statusColors.DEFAULT;
    //     return (
    //         <>
    //             <div style={{ padding: '6px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="text-sm text-zinc-700 dark:text-zinc-300">{row.name}</div>
    //             {visibleColumns.map((c, i) => {
    //                 const overlap = (row.start < c.colEnd) && (row.end > c.colStart);
    //                 return (
    //                     <div key={`${row.name}-c-${i}`} style={{ width: computedCellSize, height: computedCellSize, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
    //                         <div style={{ width: '100%', height: '100%', background: overlap ? bg : 'transparent', borderRadius: 2 }} />
    //                     </div>
    //                 );
    //             })}
    //             <div style={{ padding: '6px 8px' }} className="text-xs text-zinc-500 dark:text-zinc-400 text-right">{format(row.end, 'MMM d')}</div>
    //         </>
    //     );
    // };
    
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
                    {/* <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"> 30 Nov
                    </div> */}
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
                
                <div
                    ref={containerRef}
                    className="relative"
                    style={{
                        width: leftWidth + (totalColumns * computedCellSize) + rightWidth,
                        minWidth: "100%",
                    }}
                >
                    {/* Timeline grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `${leftWidth}px repeat(${totalColumns}, ${computedCellSize}px) ${rightWidth}px`,
                            alignItems: 'center',
                            gap: 0,
                            position: 'relative',
                            zIndex: 10,
                        }}
                    >
                        {/* months header */}
                        <div />
                        {monthsAll.map((m, mi) => (
                            <div
                                key={mi}
                                style={{
                                    gridColumn: `span 4`,
                                    textAlign: 'center',
                                    padding: '6px 4px',
                                    fontWeight: 600,
                                }}
                                className="text-zinc-700 dark:text-zinc-300"
                            >
                                {format(m.monthStart, 'MMM yyyy')}
                            </div>
                        ))}
                        <div />

                        {/* week labels row */}
                        <div />
                        {monthsAll.map((m, mi) =>
                            ['I', 'II', 'III', 'IV'].map((wk, wi) => (
                                <div
                                    key={`${mi}-${wi}`}
                                    style={{
                                        width: computedCellSize,
                                        height: computedCellSize,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                    }}
                                    className="text-zinc-500 dark:text-zinc-400"
                                >
                                    {wk}
                                </div>
                            ))
                        )}
                        <div />

                        {/* rows area */}
                        {rows.length === 0 ? (
                            <>
                                <div />
                                {Array.from({ length: totalColumns }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: computedCellSize,
                                            height: computedCellSize,
                                            borderRight: '1px solid rgba(0,0,0,0.06)',
                                        }}
                                    />
                                ))}
                                <div />
                                <div
                                    style={{
                                        gridColumn: `1 / ${totalColumns + 3}`,
                                    }}
                                    className="py-8 text-center text-zinc-600 dark:text-zinc-400"
                                >
                                    No tasks available to build the timeline.
                                </div>
                            </>
                        ) : (
                            rows.map((r, idx) => (
                                <React.Fragment key={r.name || idx}>
                                    {renderRow(r)}
                                </React.Fragment>
                            ))
                        )}
                    </div>

                    {/* garis vertikal today */}
                    {(() => {
                    const today = new Date();
                    if (today >= timelineStart && today <= timelineEnd) {
                        const daysFromStart = differenceInCalendarDays(today, timelineStart);
                        const weekIndex = Math.floor(daysFromStart / 7); // minggu ke-berapa
                        const offsetInWeek = (daysFromStart % 7) / 7; // posisi relatif dalam minggu

                        // total minggu dalam seluruh timeline
                        const totalWeeks = totalColumns; // 4 kolom per bulan
                        const left =
                        leftWidth +
                        (weekIndex + offsetInWeek) * computedCellSize; // pixel position dari kiri label

                        return (
                        <div
                            className="absolute top-[68px] bottom-[0px] border-l-2 border-blue-400 z-20"
                            style={{
                            left: `${left}px`,
                            pointerEvents: "none",
                            }}
                        >
                            <div className="absolute -top-5 -left-6 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                            {/* {format(today, "dd MMM")} */}
                            today {/*{format(today, "dd/MM/yy")} */}
                            </div>
                        </div>
                        );
                    }
                    return null;
                    })()}

                    {/* garis vertikal due date */}
                    {(() => {
                    const due = project?.end_date ? new Date(project.end_date) : null;

                    // const due = new Date(tasks.due_date);
                    // const due = new Date(project.end_date);

                    // Hitung jarak dari awal timeline
                    const daysFromStart = differenceInCalendarDays(due, timelineStart);
                    const weekIndex = Math.floor(daysFromStart / 7);
                    const offsetInWeek = (daysFromStart % 7) / 7;

                    // Hitung posisi garis secara pixel
                    const left =
                        leftWidth + (weekIndex + offsetInWeek) * computedCellSize;

                    return (
                        <div
                        className="absolute top-[68px] bottom-[0px] border-l-2 border-red-500 z-20"
                        style={{
                            left: `${left}px`,
                            pointerEvents: "none",
                        }}
                        >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                            {/* {format(due, "dd MMM")} */}
                            due
                        </div>
                        </div>
                    );
                    })()}

                </div>

            </div>
            <AddFileDialog
                showDialog={isDialogOpen}
                setShowDialog={setIsDialogOpen}
                taskId={selectedTaskForDialog?.id}
                getWeekIndexForDate={getWeekIndexForDate}
                visibleColumns={visibleColumns}
                taskName={selectedTaskForDialog?.name}
                weekIndexOnClick={selectedColForDialog}  
                onSuccess={() =>
                    setCompletedCells(prev => [
                        ...prev,
                        { taskId: selectedTaskForDialog.id, col: selectedColForDialog }
                    ])
                }
                
            />

        </div>
        
    );
};

export default ProjectCalendar;
