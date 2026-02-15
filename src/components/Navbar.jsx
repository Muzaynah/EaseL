import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `px-5 py-2 rounded-xl font-semibold transition-all duration-200 ${
      isActive
        ? "bg-white text-indigo-600 shadow-md"
        : "text-white/90 hover:bg-white/20"
    }`;

  return (
    <nav className="fixed top-0 left-0 w-full z-[1000] backdrop-blur-md bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-white font-bold text-lg tracking-wide">
          Gesture Canvas
        </h1>

        <div className="flex gap-4">
          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/canvas" className={linkClass}>
            Canvas
          </NavLink>
          <NavLink to="/gallery" className={linkClass}>
            Gallery
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
