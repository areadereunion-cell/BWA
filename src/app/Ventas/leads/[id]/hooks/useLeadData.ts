"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, Note } from "../types";

export function useLeadData(leadId: string | undefined, usuario: any) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario || !leadId) return;

    async function cargar() {
      try {
        setLoading(true);

        const leadRes = await fetch(`/api/leads/${leadId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!leadRes.ok) return router.push("/no-autorizado");

        const leadJson = await leadRes.json();
        const leadData: Lead | null =
          leadJson?.lead && typeof leadJson?.lead === "object" ? leadJson.lead : leadJson;

        if (!leadData?.id) return router.push("/no-autorizado");

        const esAsesor = usuario.rol === "asesor";
        if (esAsesor && Number(leadData.asignado_a) !== Number(usuario.id)) {
          return router.push("/no-autorizado");
        }

        let resolvedLead = { ...leadData };
        if (!resolvedLead.nombre_asesor && resolvedLead.asignado_a) {
          try {
            const uRes = await fetch(`/api/users/${resolvedLead.asignado_a}`, {
              credentials: "include",
              cache: "no-store",
            });
            if (uRes.ok) {
              const uJson = await uRes.json();
              const u = uJson?.user ?? uJson;
              if (u?.nombre) resolvedLead.nombre_asesor = String(u.nombre);
            }
          } catch {}
        }

        setLead(resolvedLead);

        const notesRes = await fetch(`/api/leads/${leadId}/notes`, {
          credentials: "include",
          cache: "no-store",
        });
        const notesData = await notesRes.json();
        setNotes(Array.isArray(notesData) ? notesData : []);
      } catch (e) {
        console.error(e);
        router.push("/no-autorizado");
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, [usuario, leadId, router]);

  async function refreshNotes() {
    if (!leadId) return;
    const updated = await fetch(`/api/leads/${leadId}/notes`, {
      credentials: "include",
      cache: "no-store",
    }).then((r) => r.json());
    setNotes(Array.isArray(updated) ? updated : []);
  }

  async function changeEstado(nuevoEstado: string) {
    if (!leadId) return { ok: false };

    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (!res.ok) return { ok: false };

    const updatedJson = await res.json();
    const updatedLead =
      updatedJson?.lead && typeof updatedJson?.lead === "object" ? updatedJson.lead : updatedJson;

    if (updatedLead?.estado) {
      setLead((prev) => (prev ? { ...prev, estado: updatedLead.estado } : prev));
    }

    return { ok: true, estado: updatedLead?.estado };
  }

  async function postNote(contenido: string) {
    if (!leadId) return false;
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contenido }),
    });
    if (!res.ok) return false;
    await refreshNotes();
    return true;
  }

  return { lead, setLead, notes, loading, changeEstado, postNote, refreshNotes };
}