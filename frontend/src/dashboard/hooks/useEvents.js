import { useEffect, useMemo, useState } from "react";
import StorageService from "../../storage/storageService";

// Read-only aggregator of every note.events[] across the existing Iron Rabbit store.
// Does NOT write, edit, or migrate anything. Restaurants Galore items live in
// their own stores (kept separate) — we intentionally only read from
// StorageService.getAllNotes() to stay untouched by that frozen module.
export default function useEvents() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await StorageService.getAllNotes();
        if (!cancelled) setNotes(Array.isArray(all) ? all : []);
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const events = useMemo(() => {
    const out = [];
    for (const n of notes) {
      if (n?.deleted_at || n?.archived_at) continue;
      const list = Array.isArray(n.events) ? n.events : [];
      for (const e of list) {
        const dt = new Date(e.datetime);
        if (isNaN(dt.getTime())) continue;
        out.push({
          id: e.id || `${n.id}-${e.datetime}`,
          title: e.title || n.title || "Untitled",
          datetime: dt,
          alarm_enabled: !!e.alarm_enabled,
          location: e.location || "",
          note_id: n.id,
          note_title: n.title || "Untitled",
          note_color: n.color || null,
          note_category: n.category || null,
        });
      }
    }
    out.sort((a, b) => a.datetime - b.datetime);
    return out;
  }, [notes]);

  return { events, loading };
}
