import { useEffect, useState } from "react";

export default function Gallery() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("gesture-projects") || "[]");
    setProjects(saved.reverse());
  }, []);

  function deleteProject(index) {
    const updated = [...projects];
    updated.splice(index, 1);
    setProjects(updated);
    localStorage.setItem(
      "gesture-projects",
      JSON.stringify([...updated].reverse())
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-10 pt-28 pb-16">
      <h2 className="text-3xl font-bold text-slate-800 mb-10">
        Saved Projects
      </h2>

      {projects.length === 0 && (
        <p className="text-slate-500">No saved drawings yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((img, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200"
          >
            <img src={img} alt="Drawing" className="w-full" />
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-slate-500">
                Project {projects.length - i}
              </span>
              <button
                onClick={() => deleteProject(i)}
                className="text-red-600 text-sm font-semibold hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
