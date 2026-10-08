"use client";
import { useEffect, useState } from "react";
export function usePagedResource<T>(endpoint: string) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${endpoint}?page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn’t load your saved data.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Please try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [endpoint, page, search, revision]);
  return { data, error, loading, page, setPage, search, searchFor: (value: string) => { setSearch(value); setPage(1); }, refresh: () => setRevision(v => v + 1) };
}
