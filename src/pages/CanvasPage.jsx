// CanvasPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useBeforeUnload } from "react-router-dom";
import { Menu, Brush, Pencil, Eraser, PaintBucket } from "lucide-react";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useDrawing } from "../hooks/useDrawing";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useAppState } from "../context/AppStateContext";
import CanvasControls from "../components/CanvasControls";
import { getCanvasCoordinates } from "../utils/canvasUtils";
import { resolveActivationConfig } from "../utils/activationConfig";
import { appendTelemetryLog } from "../utils/persistence";
import { UI_TOKENS } from "../theme/uiTokens";

import DrawingCanvas from "../components/DrawingCanvas";
import LayerPanel from "../components/LayerPanel";
import CameraPreview from "../components/CameraPreview";
import Cursor from "../components/Cursor";
import SettingsModal from "../components/SettingsModal";
import { useAuth } from "../context/AuthContext";
import { useCursorPositionBridgeRef } from "../context/CursorPositionBridgeContext";
import {
    getCanvasProjectCloud,
    isFirestorePermissionError,
    saveCanvasProjectCloud,
} from "../firebase/cloudData";

const BRUSH_SIZE_MAP = { S: 8, M: 20, L: 32, XL: 48 };

function getInitialBrushSize(settings) {
    const size = settings?.brushSize ?? "M";
    return BRUSH_SIZE_MAP[size] ?? 20;
}

const TOOL_META = {
    brush: { label: "Brush", Icon: Brush },
    eraser: { label: "Eraser", Icon: Eraser },
    fill: { label: "Fill", Icon: PaintBucket },
};

export default function CanvasPage() {
    const { profile, settings } = useAppState();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cursorRef = useRef(null);

    const [brushSize, setBrushSize] = useState(() => getInitialBrushSize(settings));
    const [brushColor, setBrushColor] = useState(
        () => settings?.defaultBrushColor ?? UI_TOKENS.brush.default
    );
    const [tool, setTool] = useState("brush");
    const [isPenDown, setIsPenDown] = useState(false);
    const [strokeState, setStrokeState] = useState("idle");
    const [stateReason, setStateReason] = useState("");

    const activationConfig = resolveActivationConfig(profile, "canvas");
    const { cursorPosRef, updateCursorFromLandmarks, freezeRecalibrationRef } = useCalibratedCursor(profile);
    const cursorPos = cursorPosRef;

    const toolRef = useRef(tool);
    const colorRef = useRef(brushColor);
    const isPenDownRef = useRef(isPenDown);
    toolRef.current = tool;
    colorRef.current = brushColor;
    isPenDownRef.current = isPenDown;

    const [hoveredButton, setHoveredButton] = useState(null);
    const activationTsRef = useRef(null);
    const wasInsideRef = useRef(false);

    const [layers, setLayers] = useState([
        { id: "layer_1", name: "Layer 1", visible: true, canvasData: null },
    ]);
    const [activeLayerId, setActiveLayerId] = useState("layer_1");
    const [currentProjectId, setCurrentProjectId] = useState(null);
    const pendingProjectLayersRef = useRef(null);

    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    // Sidebar collapse states
    const [leftCompact, setLeftCompact] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    const buttonRefs = useRef({});

    const prevSettings = useRef({ color: brushColor, tool, size: brushSize });

    const {
        draw,
        fillAt,
        startStroke,
        endStroke,
        clear,
        undo,
        redo,
        canUndo,
        canRedo,
        initCanvas,
        getLayerCanvasData,
        loadProjectLayers,
    } = useDrawing({
        canvasRef,
        brushSize,
        brushColor,
        tool,
        layers,
        activeLayerId,
    });

    const { processLandmarks } = useGestureControl({
        onPenToggle: handlePenToggle,
        onButtonHover: setHoveredButton,
        onButtonClick: handleButtonClick,
        onMouthEvent: ({ accepted }) => {
            if (!accepted) setStateReason("mouth-not-confirmed");
        },
        onActivateOutside: () => setStateReason("activate-outside"),
        buttonRefs,
        cursorPosRef: cursorPosRef,
        activationMethod: activationConfig.activationMethod,
        mouthOpenThreshold: activationConfig.mouthOpenThreshold,
        framesToConfirm: activationConfig.framesToConfirm,
        cooldownMs: activationConfig.cooldownMs,
        dwellMs: activationConfig.dwellMs,
        dwellRadius: activationConfig.dwellRadius,
    });

    const handleFaceMeshResults = useCallback(
        (results) => {
            if (!results.multiFaceLandmarks?.[0]) return;
            const landmarks = results.multiFaceLandmarks[0];
            updateCursorFromLandmarks(landmarks);
            processLandmarks(landmarks, isPenDownRef.current);

            const position = cursorPos.current;
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();
                const inside =
                    position.x >= rect.left &&
                    position.x <= rect.right &&
                    position.y >= rect.top &&
                    position.y <= rect.bottom;

                if (isPenDownRef.current && inside) {
                    const { x, y } = getCanvasCoordinates(canvas, position.x, position.y);
                    draw(x, y);
                }
                if (isPenDownRef.current && !inside && wasInsideRef.current) {
                    setStrokeState("paused");
                    setStateReason("out-of-canvas");
                    appendTelemetryLog({ area: "canvas", event: "stroke-paused", reason: "out-of-canvas" });
                } else if (isPenDownRef.current && inside && !wasInsideRef.current) {
                    setStrokeState("drawing");
                    setStateReason("resumed");
                    appendTelemetryLog({ area: "canvas", event: "stroke-resumed" });
                }
                wasInsideRef.current = inside;
            }
        },
        [updateCursorFromLandmarks, processLandmarks, draw]
    );

    const { startFaceMesh } = useFaceMesh({ videoRef, onResults: handleFaceMeshResults });

    function handlePenToggle(newPenState) {
        if (newPenState && toolRef.current === "fill") {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const inside =
                cursorPos.current.x >= rect.left &&
                cursorPos.current.x <= rect.right &&
                cursorPos.current.y >= rect.top &&
                cursorPos.current.y <= rect.bottom;
            if (inside) {
                const { x, y } = getCanvasCoordinates(
                    canvasRef.current, cursorPos.current.x, cursorPos.current.y
                );
                fillAt(x, y, colorRef.current);
            }
            return;
        }
        if (newPenState && !isPenDownRef.current) {
            activationTsRef.current = performance.now();
            startStroke();
            isPenDownRef.current = true;
            setIsPenDown(true);
            if (freezeRecalibrationRef) freezeRecalibrationRef.current = true;
            setStrokeState("drawing");
            setStateReason("activation-detected");
            appendTelemetryLog({
                area: "canvas",
                event: "stroke-start",
                activationMethod: activationConfig.activationMethod,
            });
        } else if (!newPenState && isPenDownRef.current) {
            endStroke();
            isPenDownRef.current = false;
            setIsPenDown(false);
            if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
            setStrokeState("complete");
            setStateReason("manual-stop");
            appendTelemetryLog({ area: "canvas", event: "stroke-stop", reason: "toggle-up" });
            setTimeout(() => { setStrokeState("idle"); setStateReason(""); }, 700);
        }
    }

    function handleButtonClick(btnId) {
        if (isPenDownRef.current) {
            endStroke();
            isPenDownRef.current = false;
            setIsPenDown(false);
            if (freezeRecalibrationRef) freezeRecalibrationRef.current = false;
            setStrokeState("idle");
            setStateReason("control-click");
        }
        if (!btnId) return;
        if (btnId === "clear") clear();
        else if (btnId === "undo") undo();
        else if (btnId === "redo") redo();
        else if (btnId === "save") saveProject();
        else if (btnId.startsWith("col-")) setBrushColor(btnId.replace("col-", ""));
        else if (btnId === "brush") setTool("brush");
        else if (btnId === "eraser") setTool("eraser");
        else if (btnId === "fill") setTool("fill");
    }

    function handleLayerAdd() {
        const id = `layer_${Date.now()}`;
        setLayers((prev) => [
            ...prev,
            { id, name: `Layer ${prev.length + 1}`, visible: true, canvasData: null },
        ]);
        setActiveLayerId(id);
    }

    function handleLayerDelete(layerId) {
        if (layers.length <= 1) return;
        const next = layers.filter((l) => l.id !== layerId);
        setLayers(next);
        if (activeLayerId === layerId) setActiveLayerId(next[0]?.id ?? "layer_1");
    }

    function handleLayerSelect(layerId) { setActiveLayerId(layerId); }

    function handleLayerToggleVisibility(layerId) {
        setLayers((prev) =>
            prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
        );
    }

    function handleLayerReorder(layerId, direction) {
        setLayers((prev) => {
            const i = prev.findIndex((l) => l.id === layerId);
            if (i === -1) return prev;
            const j = direction === "up" ? i - 1 : i + 1;
            if (j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    }

    useEffect(() => {
        const settingsChanged =
            prevSettings.current.color !== brushColor ||
            prevSettings.current.tool !== tool ||
            prevSettings.current.size !== brushSize;
        if (settingsChanged && isPenDown) {
            endStroke();
            startStroke();
            setStrokeState("drawing");
            setStateReason("settings-updated");
        }
        prevSettings.current = { color: brushColor, tool, size: brushSize };
    }, [brushColor, tool, brushSize]);

    useEffect(() => {
        let cancelled = false;
        let faceMeshCleanup = null;
        const timeoutId = setTimeout(() => {
            if (cancelled) return;
            faceMeshCleanup = startFaceMesh();
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            if (typeof faceMeshCleanup === "function") faceMeshCleanup();
        };
    }, [startFaceMesh]);

    useEffect(() => {
        if (canvasRef.current) initCanvas();
    }, [initCanvas]);

    useEffect(() => {
        const projectId = searchParams.get("project");
        if (!projectId || !user?.uid) return;
        let cancelled = false;
        (async () => {
            try {
                const project = await getCanvasProjectCloud(user.uid, projectId);
                if (!project || cancelled) return;
                const projectLayers = Array.isArray(project.layers) ? project.layers : [];
                if (!projectLayers.length) return;
                setLayers(
                    projectLayers.map((l, idx) => ({
                        id: l.id || `layer_${idx + 1}`,
                        name: l.name || `Layer ${idx + 1}`,
                        visible: l.visible !== false,
                        canvasData: null,
                    }))
                );
                setActiveLayerId(project.activeLayerId || projectLayers[0]?.id || "layer_1");
                setCurrentProjectId(project.id);
                pendingProjectLayersRef.current = Object.fromEntries(
                    projectLayers.map((l, idx) => [l.id || `layer_${idx + 1}`, l.canvasData || ""])
                );
            } catch (e) {
                if (isFirestorePermissionError(e)) {
                    setStateReason("cloud-read-permission-denied");
                    return;
                }
                console.warn("load project failed", e);
            }
        })();
        return () => { cancelled = true; };
    }, [searchParams, user?.uid]);

    useEffect(() => {
        const dataMap = pendingProjectLayersRef.current;
        if (!dataMap || !layers.length) return;
        pendingProjectLayersRef.current = null;
        loadProjectLayers(dataMap);
    }, [layers, loadProjectLayers]);

    const canvasBridge = useCursorPositionBridgeRef();

    useEffect(() => {
        let animationFrameId;
        const renderCursor = () => {
            const x = cursorPos.current.x;
            const y = cursorPos.current.y;
            if (cursorRef.current) {
                cursorRef.current.style.left = x + "px";
                cursorRef.current.style.top  = y + "px";
            }
            // Publish into the bridge so Navbar can detect head cursor near top
            if (canvasBridge?.current) {
                canvasBridge.current.raw = { x, y };
            }
            animationFrameId = requestAnimationFrame(renderCursor);
        };
        renderCursor();
        return () => cancelAnimationFrame(animationFrameId);
    }, [canvasBridge]);

    const [saveStatus, setSaveStatus] = useState("idle");
    const [hasUnsavedStrokes, setHasUnsavedStrokes] = useState(false);

    // Mark dirty whenever a stroke ends; clear on save
    useEffect(() => {
        if (strokeState === "complete") setHasUnsavedStrokes(true);
    }, [strokeState]);

    // Warn on browser unload (tab close / refresh)
    useBeforeUnload(
        useCallback(
            (e) => {
                if (hasUnsavedStrokes && saveStatus === "idle") e.preventDefault();
            },
            [hasUnsavedStrokes, saveStatus]
        )
    );

    async function saveProject() {
        if (!canvasRef.current || saveStatus !== "idle" || !user?.uid) return;
        setSaveStatus("saving");
        await new Promise((r) => setTimeout(r, 400));
        try {
            const title = `Project ${new Date().toLocaleString()}`;
            const serializedLayers = layers.map((l) => ({
                id: l.id,
                name: l.name,
                visible: l.visible !== false,
                canvasData: getLayerCanvasData(l.id),
            }));
            const projectId = await saveCanvasProjectCloud(user.uid, {
                id: currentProjectId,
                title,
                width: canvasRef.current.width,
                height: canvasRef.current.height,
                activeLayerId,
                layers: serializedLayers,
                thumbnail: canvasRef.current.toDataURL("image/png"),
            });
            if (projectId) setCurrentProjectId(projectId);
            setSaveStatus("saved");
            setHasUnsavedStrokes(false);
            setTimeout(() => setSaveStatus("idle"), 2500);
        } catch (e) {
            if (isFirestorePermissionError(e)) {
                setStateReason("cloud-save-permission-denied");
            } else {
                console.warn("saveProject failed", e);
                setStateReason("cloud-save-failed");
            }
            setSaveStatus("idle");
        }
    }

    const canvasBg = settings?.canvasBg ?? "white";
    const isDrawing = isPenDown || strokeState === "drawing";
    const ToolIcon = TOOL_META[tool]?.Icon ?? Brush;
    const toolLabel = TOOL_META[tool]?.label ?? "Brush";

    return (
        <div className="easeL-page-bg min-h-screen relative overflow-hidden easeL-page-top font-sans select-none">
            <div className="mx-auto flex max-w-[1800px] gap-3 px-3 pb-3" style={{ height: "calc(100vh - var(--nav-offset, 96px))" }}>

                {/* ── Left sidebar: Drawing tools ── */}
                <aside
                    className={`hidden xl:flex flex-col gap-3 transition-all duration-300 overflow-hidden ${
                        leftCompact ? "w-14" : "w-72"
                    }`}
                >
                    {leftCompact && (
                        <button
                            onClick={() => setLeftCompact(false)}
                            className="easeL-card rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] p-3 shadow-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
                            aria-label="Expand tools panel"
                            title="Show drawing tools"
                        >
                            <Brush className="w-5 h-5 text-[var(--easeL-primary)]" />
                        </button>
                    )}
                    {/* Always mounted so the floating mini toolbar renders when compact */}
                    <div className={leftCompact ? "sr-only" : "flex flex-col flex-1 min-h-0"}>
                        <CanvasControls
                            ref={buttonRefs}
                            tool={tool}
                            setTool={setTool}
                            color={brushColor}
                            setColor={setBrushColor}
                            brushSize={brushSize}
                            setBrushSize={setBrushSize}
                            onUndo={undo}
                            onRedo={redo}
                            onClear={clear}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            hoveredButton={hoveredButton}
                            onSaveProject={saveProject}
                            saveStatus={saveStatus}
                            onOpenSettings={() => setSettingsModalOpen(true)}
                            compactMode={leftCompact}
                            onToggleCompact={() => setLeftCompact(true)}
                        />
                    </div>
                </aside>

                {/* ── Main canvas area ── */}
                <main className="flex-1 flex flex-col min-h-0 min-w-0">
                    <div className="easeL-card flex flex-col rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] shadow-xl flex-1 min-h-0 overflow-hidden">

                        {/* Canvas header */}
                        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/60">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[var(--easeL-primary)] opacity-60" />
                                <p className="text-sm font-bold text-slate-700 tracking-wide">Drawing workspace</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Pen state indicator */}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
                                    isDrawing
                                        ? "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200"
                                        : "bg-slate-100 text-slate-500"
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isDrawing ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                    {isDrawing ? "DRAWING" : strokeState === "paused" ? "PAUSED" : "READY"}
                                </div>
                                {/* Current tool badge */}
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--easeL-primary)] text-white text-xs font-semibold shadow-sm">
                                    <ToolIcon className="w-3 h-3" />
                                    {toolLabel}
                                </div>
                                {/* Color dot */}
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200"
                                    style={{ backgroundColor: brushColor }}
                                    title={`Current color: ${brushColor}`}
                                />
                            </div>
                        </div>

                        {/* Canvas body — fills all remaining space */}
                        <div className={`flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
                            isDrawing ? "ring-2 ring-inset ring-emerald-400/30" : ""
                        }`}>
                            <DrawingCanvas canvasRef={canvasRef} canvasBg={canvasBg} />
                        </div>
                    </div>
                </main>

                {/* ── Right sidebar: Layers + Camera ── */}
                <aside
                    className={`hidden xl:flex flex-col gap-3 transition-all duration-300 overflow-hidden ${
                        rightCollapsed ? "w-14" : "w-72"
                    }`}
                >
                    {rightCollapsed ? (
                        <button
                            onClick={() => setRightCollapsed(false)}
                            className="easeL-card rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] p-3 shadow-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
                            aria-label="Expand layers panel"
                            title="Show layers"
                        >
                            <Menu className="w-5 h-5 text-[var(--easeL-primary)] rotate-90" />
                        </button>
                    ) : (
                        <>
                            {/* Layers panel */}
                            <div className="easeL-card rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] shadow-xl flex-1 min-h-0 flex flex-col overflow-hidden">
                                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/60">
                                    <p className="text-sm font-bold text-slate-700">Layers</p>
                                    <button
                                        onClick={() => setRightCollapsed(true)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                                        aria-label="Collapse layers panel"
                                    >
                                        <Menu className="w-4 h-4 rotate-90" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                                    <LayerPanel
                                        layers={layers}
                                        activeLayerId={activeLayerId}
                                        getLayerCanvasData={getLayerCanvasData}
                                        onLayerSelect={handleLayerSelect}
                                        onLayerAdd={handleLayerAdd}
                                        onLayerDelete={handleLayerDelete}
                                        onLayerToggleVisibility={handleLayerToggleVisibility}
                                        onLayerReorder={handleLayerReorder}
                                    />
                                </div>
                            </div>

                            {/* Camera feed */}
                            <div className="easeL-card rounded-3xl border-2 border-slate-200 bg-[var(--easeL-bg-section)] p-3 shadow-xl shrink-0">
                                <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">Camera feed</p>
                                <CameraPreview videoRef={videoRef} />
                            </div>
                        </>
                    )}
                </aside>
            </div>

            <Cursor
                ref={cursorRef}
                left={cursorPos.current.x}
                top={cursorPos.current.y}
                size={brushSize}
                isPenDown={isPenDown}
                tool={tool}
            />

            <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
        </div>
    );
}
