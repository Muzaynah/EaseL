import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CanvasPage from "./pages/CanvasPage";
import Gallery from "./pages/Gallery";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
    </>
  );
}
