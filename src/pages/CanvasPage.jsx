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
    const cursorRef = useRef(null); // ✅ Added ref for Cursor DOM

    const [brushSize, setBrushSize] = useState(20);
    const [brushColor, setBrushColor] = useState("#FFD133");
    const [tool, setTool] = useState("brush");
    const [isPenDown, setIsPenDown] = useState(false);

    const cursorPos = useRef({ x: 800, y: 500 }); // ✅ Keep ref-based cursor

    const [hoveredButton, setHoveredButton] = useState(null);

    const buttonRefs = useRef({});

    /* ================= FACE MESH ================= */

    const { startFaceMesh } = useFaceMesh({
        videoRef,
        onResults: handleFaceMeshResults,
    });

    /* ================= DRAWING ================= */

    const {
        draw,
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

    /* ================= GESTURE CONTROL ================= */

    const { processLandmarks } = useGestureControl({
        onPenToggle: handlePenToggle,
        onButtonHover: setHoveredButton,
        buttonRefs,
    });

    /* ================= PEN TOGGLE ================= */

    function handlePenToggle(newPenState) {
        if (newPenState && !isPenDown) {
            startStroke();
            setIsPenDown(true);
        } else if (!newPenState && isPenDown) {
            endStroke();
            setIsPenDown(false);
        }
    }

    /* ================= INITIALIZE ================= */

    useEffect(() => {
        startFaceMesh();
    }, [startFaceMesh]);

    useEffect(() => {
        if (canvasRef.current) initCanvas();
    }, [initCanvas]);

    /* ================= CURSOR ANIMATION ================= */
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

    /* ================= FACE RESULTS ================= */

    function handleFaceMeshResults(results) {
        if (!results.multiFaceLandmarks?.[0]) return;

        const landmarks = results.multiFaceLandmarks[0];

        const { position, hoveredBtn } = processLandmarks(
            landmarks,
            isPenDown
        );

        // Update ref-based cursor position
        cursorPos.current = position;

        // Handle toolbar hover clicks
        if (hoveredBtn) {
            handleButtonClick(hoveredBtn);
            return;
        }

        // Drawing logic
        if (isPenDown && canvasRef.current) {
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
            } else {
                endStroke();
            }
        }
    }

    /* ================= TOOL ACTIONS ================= */

    function handleButtonClick(btnId) {
        if (btnId === "clear") clear();
        else if (btnId === "undo") undo();
        else if (btnId === "redo") redo();
        else if (btnId.startsWith("col-"))
            setBrushColor(btnId.replace("col-", ""));
        else if (btnId === "brush") setTool("brush");
        else if (btnId === "eraser") setTool("eraser");
        else if (btnId === "fill") setTool("fill");
    }

    /* ================= SAVE PROJECT ================= */

    function saveProject() {
        if (!canvasRef.current) return;

        const data = canvasRef.current.toDataURL();
        const existing = JSON.parse(
            localStorage.getItem("gesture-projects") || "[]"
        );

        existing.push(data);
        localStorage.setItem("gesture-projects", JSON.stringify(existing));
    }

    /* ================= RENDER ================= */

    return (
        <div className="relative w-screen h-screen pt-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden font-sans select-none">

            <StatusHUD isPenDown={isPenDown} />

            <DrawingCanvas canvasRef={canvasRef} />

            <Cursor
                ref={cursorRef} // ✅ Pass ref
                position={cursorPos.current}
                size={brushSize}
                color={brushColor}
                isPenDown={isPenDown}
                tool={tool}
            />

            <CanvasControls
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
                buttonRefs={buttonRefs}
            />

            <CameraPreview videoRef={videoRef} />

            <button
                onClick={saveProject}
                className="absolute top-24 right-10 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition"
            >
                Save Project
            </button>
        </div>
    );
}
