"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

interface TimeInfo {
  iso: string;
  utcOffset: number;
  tz: string;
}

function fmt(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
}

function Row({ label, info, error }: { label: string; info: TimeInfo | null; error?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {info ? (
        <div className="text-right font-mono">
          <div>{fmt(info.iso)}</div>
          <div className="text-[10px] text-muted-foreground">{info.tz} (UTC{info.utcOffset >= 0 ? "+" : ""}{info.utcOffset})</div>
        </div>
      ) : (
        <span className={`font-mono ${error ? "text-destructive" : "text-muted-foreground"}`}>
          {error ? "erro" : "…"}
        </span>
      )}
    </div>
  );
}

export function DevClock() {
  const { data: session } = useSession();
  const permissao = (session?.usuario as { permissao?: string } | undefined)?.permissao;

  const [browser, setBrowser] = useState<TimeInfo | null>(null);
  const [nextjs, setNextjs] = useState<TimeInfo | null>(null);
  const [backend, setBackend] = useState<TimeInfo | null>(null);
  const [backendError, setBackendError] = useState(false);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (permissao !== "DEV") return;

    function tick() {
      const now = new Date();
      setBrowser({
        iso: now.toISOString(),
        utcOffset: -now.getTimezoneOffset() / 60,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }

    async function fetchNextjs() {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/debug/time`, { cache: "no-store" });
        if (r.ok) setNextjs(await r.json());
      } catch {}
    }

    async function fetchBackend() {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      if (!base) return;
      try {
        const r = await fetch(`${base}/debug/time`, { cache: "no-store" });
        if (r.ok) {
          setBackend(await r.json());
          setBackendError(false);
        } else {
          setBackendError(true);
        }
      } catch {
        setBackendError(true);
      }
    }

    tick();
    fetchNextjs();
    fetchBackend();

    intervalRef.current = setInterval(() => {
      tick();
      fetchNextjs();
      fetchBackend();
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [permissao]);

  if (permissao !== "DEV" || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border bg-background/95 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold">🕐 Dev · Horários</span>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground text-xs leading-none"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <Row label="🌐 Browser" info={browser} />
        <Row label="🖥️ Next.js (SSR)" info={nextjs} />
        <Row label="⚙️ Backend" info={backend} error={backendError} />
      </div>
    </div>
  );
}
