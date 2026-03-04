"use client";

import type { Note } from "../types";

export function NotesSection({
  noteText,
  setNoteText,
  onSave,
  notes,
}: {
  noteText: string;
  setNoteText: (v: string) => void;
  onSave: () => void;
  notes: Note[];
}) {
  return (
    <>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <label className="block mb-2 font-semibold text-white/85">Agregar nota:</label>
        <textarea
          className="w-full p-3 rounded-xl border border-white/10 bg-black/25 text-white placeholder:text-white/40 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none"
          rows={3}
          placeholder="Escribe aquí tu nota..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <button
          onClick={onSave}
          className="mt-3 px-5 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-white font-semibold hover:bg-emerald-500/30 transition"
        >
          Guardar nota
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <h3 className="text-2xl font-bold mb-4 text-white">Historial de notas</h3>

        {notes.length === 0 ? (
          <p className="text-white/50">No hay notas aún.</p>
        ) : (
          <ul className="space-y-4">
            {notes.map((n) => (
              <li
                key={`${n.id}-${n.fecha_hora}`}
                className="p-4 rounded-2xl border border-white/10 bg-black/20"
              >
                <div className="text-white/85">{n.contenido}</div>
                <div className="mt-2 text-xs text-white/50">
                  Por: {n.autor_nombre || `Usuario #${n.autor_id}`} ·{" "}
                  {new Date(n.fecha_hora).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}