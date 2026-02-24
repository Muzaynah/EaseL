// CanvasPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useDrawing } from "../hooks/useDrawing";
import { useGestureControl } from "../hooks/useGestureControl";
import CanvasControls from "../components/CanvasControls";
import { getCanvasCoordinates } from "../utils/canvasUtils";

import DrawingCanvas from "../components/DrawingCanvas";
import LayerPanel from "../components/LayerPanel";
import CameraPreview from "../components/CameraPreview";
import Cursor from "../components/Cursor";
import StatusHUD from "../components/StatusHUD";

export default function CanvasPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cursorRef = useRef(null); 

    const [brushSize, setBrushSize] = useState(20);
    const [brushColor, setBrushColor] = useState("#000000");
    const [tool, setTool] = useState("brush");
    const [isPenDown, setIsPenDown] = useState(false);

    const cursorPos = useRef({ x: 800, y: 500 });
    // Refs mirror state so gesture/callbacks always see latest (avoids stale tool/color)
    const toolRef = useRef(tool);
    const colorRef = useRef(brushColor);
    const isPenDownRef = useRef(isPenDown);
    toolRef.current = tool;
    colorRef.current = brushColor;
    isPenDownRef.current = isPenDown;

    const [hoveredButton, setHoveredButton] = useState(null);

    const [layers, setLayers] = useState([
        { id: "layer_1", name: "Layer 1", visible: true, canvasData: null },
    ]);
    const [activeLayerId, setActiveLayerId] = useState("layer_1");

    const buttonRefs = useRef({});
    
    // Track previous settings to detect changes
    const prevSettings = useRef({ color: brushColor, tool, size: brushSize });

    const { startFaceMesh } = useFaceMesh({
        videoRef,
        onResults: handleFaceMeshResults,
    });

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
        buttonRefs,
    });

    function handlePenToggle(newPenState) {
        // Fill tool: one-shot fill at cursor on mouth open (no stroke, no pen down)
        // Use refs so we always see latest tool/color even when callback is from a previous render
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
                    canvasRef.current,
                    cursorPos.current.x,
                    cursorPos.current.y
                );
                fillAt(x, y, colorRef.current);
            }
            return;
        }
        if (newPenState && !isPenDownRef.current) {
            startStroke();
            isPenDownRef.current = true;
            setIsPenDown(true);
        } else if (!newPenState && isPenDownRef.current) {
            endStroke();
            isPenDownRef.current = false;
            setIsPenDown(false);
        }
    }

    function handleButtonClick(btnId) {
        // End current stroke when interacting with controls
        if (isPenDownRef.current) {
            endStroke();
            isPenDownRef.current = false;
            setIsPenDown(false);
        }
        
        if (btnId === "clear") clear();
        else if (btnId === "undo") undo();
        else if (btnId === "redo") redo();
        else if (btnId.startsWith("col-"))
            setBrushColor(btnId.replace("col-", ""));
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

    function handleLayerSelect(layerId) {
        setActiveLayerId(layerId);
    }

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

    // Detect setting changes and force stroke restart
    useEffect(() => {
        const settingsChanged = 
            prevSettings.current.color !== brushColor ||
            prevSettings.current.tool !== tool ||
            prevSettings.current.size !== brushSize;
        
        if (settingsChanged && isPenDown) {
            // End current stroke immediately
            endStroke();
            // Restart with new settings
            setTimeout(() => {
                startStroke();
            }, 0);
        }
        
        prevSettings.current = { color: brushColor, tool, size: brushSize };
    }, [brushColor, tool, brushSize]);

    // Start face mesh after a short delay so the video element is mounted and ref is set
    // (avoids cursor not moving on first visit due to ref being null when script onload runs).
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

    // One-time: tell user how to view or disable lag diagnostics in console
    const hasLoggedDebugHint = useRef(false);
    useEffect(() => {
        if (hasLoggedDebugHint.current) return;
        hasLoggedDebugHint.current = true;
        console.info(
            "[EaseL] Lag diagnostics: timing logs every 60 frames (faceMesh), every 100 draws, and per saveState. Set window.EaseL_DEBUG = false and refresh to disable."
        );
    }, []);

    useEffect(() => {
        let animationFrameId;

        const renderCursor = () => {
            if (cursorRef.current) {
                cursorRef.current.style.left = cursorPos.current.x + "px";
                cursorRef.current.style.top = cursorPos.current.y + "px";
            }
            animationFrameId = requestAnimationFrame(renderCursor);
        };

        renderCursor();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    function handleFaceMeshResults(results) {
        if (!results.multiFaceLandmarks?.[0]) return;

        const landmarks = results.multiFaceLandmarks[0];

        const { position } = processLandmarks(
            landmarks,
            isPenDownRef.current
        );

        // Update ref-based cursor position
        cursorPos.current = position;
        
        // Drawing logic - use ref so we have latest pen state from gesture
        if (isPenDownRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();

            const inside =
                position.x >= rect.left &&
                position.x <= rect.right &&
                position.y >= rect.top &&
                position.y <= rect.bottom;

            if (inside) {
                const { x, y } = getCanvasCoordinates(
                    canvas,
                    position.x,
                    position.y
                );

                draw(x, y);
            }
        }
    }

    const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved'

    async function saveProject() {
        if (!canvasRef.current || saveStatus !== "idle") return;

        setSaveStatus("saving");

        // Brief delay so user sees the loading state
        await new Promise((r) => setTimeout(r, 400));

        const data = canvasRef.current.toDataURL();
        const existing = JSON.parse(
            localStorage.getItem("gesture-projects") || "[]"
        );
        existing.push(data);
        localStorage.setItem("gesture-projects", JSON.stringify(existing));

        setSaveStatus("saved");

        // Cooldown: show "Saved!" for 2s, then re-enable save after 2.5s
        setTimeout(() => setSaveStatus("idle"), 2500);
    }

    return (
        <div className="relative w-screen h-screen pt-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden font-sans select-none">

            <StatusHUD isPenDown={isPenDown} />

            <DrawingCanvas canvasRef={canvasRef} />

            <Cursor
                ref={cursorRef} 
                position={cursorPos.current}
                size={brushSize}
                color={brushColor}
                isPenDown={isPenDown}
                tool={tool}
            />

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
            />

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

            <CameraPreview videoRef={videoRef} />

            {/* Save button: card-aligned with app style */}
            <div className="absolute top-6 right-6 z-[200] flex flex-col items-end gap-2 p-3 rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl border border-white/50">
                <button
                    onClick={saveProject}
                    disabled={saveStatus !== "idle"}
                    className={`
                        min-h-12 px-6 rounded-2xl font-semibold text-sm shadow-lg transition-all
                        flex items-center justify-center gap-2 min-w-[120px]
                        ${saveStatus === "saving"
                            ? "bg-indigo-400 cursor-wait text-white"
                            : saveStatus === "saved"
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-95 text-white"
                        }
                    `}
                >
                    {saveStatus === "saving" ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving…
                        </>
                    ) : (
                        "Save Project"
                    )}
                </button>

                {/* Progress bar shown while saving (animates 0% -> 100%) */}
                {saveStatus === "saving" && (
                    <div className="w-full max-w-[140px] h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-[400ms] ease-out"
                            style={{ width: "0%" }}
                            ref={(el) => {
                                if (!el) return;
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        el.style.width = "100%";
                                    });
                                });
                            }}
                        />
                    </div>
                )}

                {/* Toast: Painting saved */}
                {saveStatus === "saved" && (
                    <div className="absolute top-full mt-2 right-0 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-sm font-medium">
                        Painting saved!
                    </div>
                )}
            </div>
        </div>
    );
}