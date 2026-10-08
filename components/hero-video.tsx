"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Connection = EventTarget & { saveData?: boolean };

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const playback = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    let visible = false;
    let requested = false;
    let automatic = !reducedMotion.matches && !connection?.saveData;
    let disposed = false;

    function load() {
      if (requested) return;
      requested = true;
      for (const [src, type] of [
        ["/video/book-unfolding.0b85a80c9f0b.mp4", "video/mp4"],
        ["/video/book-unfolding.420f31f64307.webm", "video/webm"],
      ]) {
        const source = document.createElement("source");
        source.src = src;
        source.type = type;
        video!.appendChild(source);
      }
      video!.load();
    }
    function reconcile() {
      if (disposed) return;
      if (!visible || document.hidden || userPaused.current || !automatic) {
        video!.pause();
        return;
      }
      load();
      void video!.play().catch(() => {
        /* The poster and play button remain available. */
      });
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
        reconcile();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    const preferencesChanged = () => {
      automatic = !reducedMotion.matches && !connection?.saveData;
      reconcile();
    };
    playback.current = () => {
      if (!video.paused) {
        userPaused.current = true;
        video.pause();
      } else {
        userPaused.current = false;
        automatic = true; // An explicit play request overrides reduced motion/data saving.
        load();
        void video.play().catch(() => setPlaying(false));
      }
    };
    document.addEventListener("visibilitychange", reconcile);
    reducedMotion.addEventListener("change", preferencesChanged);
    connection?.addEventListener("change", preferencesChanged);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", reconcile);
      reducedMotion.removeEventListener("change", preferencesChanged);
      connection?.removeEventListener("change", preferencesChanged);
      playback.current = null;
      video.pause();
      video.removeAttribute("src");
      video.querySelectorAll("source").forEach((source) => source.remove());
      video.load();
    };
  }, []);

  return (
    <div className="hero-video-frame">
      <link
        rel="preload"
        as="image"
        href="/video/book-unfolding-poster.efec3cfe50b1.webp"
        fetchPriority="high"
      />
      <video
        ref={videoRef}
        className="hero-video"
        poster="/video/book-unfolding-poster.efec3cfe50b1.webp"
        width={960}
        height={540}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      />
      <button
        type="button"
        className="hero-video-control"
        onClick={() => playback.current?.()}
        aria-label={
          playing ? "Pause header animation" : "Play header animation"
        }
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
        {playing ? "Pause animation" : "Play animation"}
      </button>
    </div>
  );
}
