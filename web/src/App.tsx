import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Bundle } from "./types";
import Landing from "./Landing";
import Console from "./Console";

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [view, setView] = useState<"landing" | "console">("landing");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/cases.json`)
      .then((r) => r.json())
      .then(setBundle)
      .catch(() => setBundle(null));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <AnimatePresence mode="wait">
      {view === "landing" ? (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <Landing bundle={bundle} onLaunch={() => setView("console")} />
        </motion.div>
      ) : (
        <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {bundle
            ? <Console bundle={bundle} onBack={() => setView("landing")} />
            : <div className="grid min-h-[100dvh] place-items-center bg-void font-mono text-white/40">loading evidence…</div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
