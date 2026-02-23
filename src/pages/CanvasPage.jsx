// CanvasPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useDrawing } from "../hooks/useDrawing";
import { useGestureControl } from "../hooks/useGestureControl";
import CanvasControls from "../components/CanvasControls";
import { getCanvasCoordinates } from "../utils/canvasUtils";

import DrawingCanvas from "../components/DrawingCanvas";
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
    } = useDrawing({
        canvasRef,
        brushSize,
        brushColor,
        tool,
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

    useEffect(() => {
        startFaceMesh();
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

            <CameraPreview videoRef={videoRef} />

            {/* Save button: top-right aligned with status bar, with cooldown and feedback */}
            <div className="absolute top-6 right-6 z-[200] flex flex-col items-end gap-2">
                <button
                    onClick={saveProject}
                    disabled={saveStatus !== "idle"}
                    className={`
                        px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all
                        flex items-center justify-center gap-2 min-w-[120px]
                        ${saveStatus === "saving"
                            ? "bg-indigo-400 cursor-wait text-white"
                            : saveStatus === "saved"
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
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