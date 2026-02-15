import { NavLink } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { name: "Home", path: "/" },
    { name: "Canvas", path: "/canvas" },
    { name: "Gallery", path: "/gallery" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-neutral-950/80 backdrop-blur-xl border-b border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-8 md:px-12 h-20 flex justify-between items-center">

        {/* Logo */}
        <div className="flex items-center">
          <h1 className="px-4 py-2 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent transition-all duration-500 hover:scale-105 cursor-pointer select-none">
            EaseL
          </h1>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-10">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `
                relative text-sm font-semibold tracking-wide
                transition-all duration-300
                ${
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                }
                `
              }
            >
              {({ isActive }) => (
                <span className="relative pb-2">
                  {link.name}
                  <span
                    className={`
                      absolute left-0 bottom-0 h-[2px] w-full
                      transition-transform duration-300 origin-left
                      ${
                        isActive
                          ? "scale-x-100 bg-gradient-to-r from-indigo-400 to-pink-400"
                          : "scale-x-0 bg-white group-hover:scale-x-100"
                      }
                    `}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden relative w-8 h-8 flex flex-col justify-center items-center"
        >
          <span
            className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
              open ? "rotate-45" : "-translate-y-2"
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
              open ? "-rotate-45" : "translate-y-2"
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`
          md:hidden overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="px-8 pb-6 pt-4 space-y-4 bg-neutral-950/95 backdrop-blur-xl">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `
                block text-lg font-medium tracking-wide
                transition-colors duration-300
                ${
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                }
                `
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}