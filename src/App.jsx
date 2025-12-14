import React from "react";
import DrawCanvas from "./components/DrawCanvas";

export default function App() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
      <DrawCanvas />
    </div>
  );
}
