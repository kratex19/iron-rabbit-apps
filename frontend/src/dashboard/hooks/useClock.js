import { useEffect, useState } from "react";

// Ticking clock hook — refreshes on the next second.
export default function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Align to top of second
    const ms = 1000 - (Date.now() % 1000);
    let interval;
    const t = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 1000);
    }, ms);
    return () => { clearTimeout(t); if (interval) clearInterval(interval); };
  }, []);
  return now;
}
