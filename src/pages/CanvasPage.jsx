// CanvasPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useDrawing } from "../hooks/useDrawing";
import { useGestureControl } from "../hooks/useGestureControl";
import { useCalibratedCursor } from "../hooks/useCalibratedCursor";
import { useAppState } from "../context/AppStateContext";
import CanvasControls from "../components/CanvasControls";
import { getCanvasCoordinates } from "../utils/canvasUtils";

import DrawingCanvas from "../components/DrawingCanvas";
import LayerPanel from "../components/LayerPanel";
import CameraPreview from "../components/CameraPreview";
import Cursor from "../components/Cursor";
import StatusHUD from "../components/StatusHUD";

const BRUSH_SIZE_MAP = { S: 8, M: 20, L: 32, XL: 48 };

function getInitialBrushSize(settings) {
    const size = settings?.brushSize ?? "M";
    return BRUSH_SIZE_MAP[size] ?? 20;
}

export default function CanvasPage() {
    const { profile, settings } = useAppState();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cursorRef = useRef(null);

    const [brushSize, setBrushSize] = useState(() => getInitialBrushSize(settings));
    const [brushColor, setBrushColor] = useState(() => settings?.defaultBrushColor ?? "#000000");
    const [tool, setTool] = useState("brush");
    const [isPenDown, setIsPenDown] = useState(false);

    const { cursorPosRef, updateCursorFromLandmarks } = useCalibratedCursor(profile);
    const cursorPos = cursorPosRef;
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
        cursorPosRef: cursorPosRef,
    });

    const handleFaceMeshResults = useCallback(
        (results) => {
            if (!results.multiFaceLandmarks?.[0]) return;

            const landmarks = results.multiFaceLandmarks[0];

            // Calibrated cursor position (tilt, neutral, movement range - same as Tutorial/Screener)
            updateCursorFromLandmarks(landmarks);
            // Pen toggle and button hover/click using same cursor position
            processLandmarks(landmarks, isPenDownRef.current);

            const position = cursorPos.current;

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
        },
        [updateCursorFromLandmarks, processLandmarks, draw]
    );

    const { startFaceMesh } = useFaceMesh({
        videoRef,
        onResults: handleFaceMeshResults,
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
        else if (btnId === "save") saveProject();
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

    const canvasBg = settings?.canvasBg ?? "white";

    return (
        <div className="relative w-screen h-screen pt-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden font-sans select-none">
            <div className="absolute inset-0 flex pt-20 items-center justify-center">
                <DrawingCanvas canvasRef={canvasRef} canvasBg={canvasBg} />
            </div>

            <StatusHUD isPenDown={isPenDown} />

            <Cursor
                ref={cursorRef}
                left={cursorPos.current.x}
                top={cursorPos.current.y}
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
                onSaveProject={saveProject}
                saveStatus={saveStatus}
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
        </div>
    );
}