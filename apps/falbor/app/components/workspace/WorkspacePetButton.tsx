"use client";

import { useEffect, useRef, useState } from "react";

const PET_IMAGES = [
  "/icons/pets/Image1.png",
  "/icons/pets/Image2.png",
  "/icons/pets/Image3.png",
  "/icons/pets/Image4.png",
];
const PET_SIZE = 128;
const PET_VISIBLE_KEY = "falbor-pet-visible";
const PET_MODE_KEY = "falbor-pet-mode";
type PetMode = "images" | "red" | "blue" | "green";

type Position = { x: number; y: number };

export function WorkspacePetButton({ workspaceId }: { workspaceId: string }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PetMode>("images");
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const syncSettings = () => {
      setVisible(window.localStorage.getItem(PET_VISIBLE_KEY) === "true");
      const savedMode = window.localStorage.getItem(PET_MODE_KEY);
      if (savedMode === "images" || savedMode === "red" || savedMode === "blue" || savedMode === "green") setMode(savedMode);
    };
    syncSettings();
    window.addEventListener("falbor-pet-settings-changed", syncSettings);
    return () => window.removeEventListener("falbor-pet-settings-changed", syncSettings);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`falbor-pet-position:${workspaceId}`);
      if (saved) setPosition(JSON.parse(saved));
    } catch {
      // Ignore malformed local state and use the default position.
    }
  }, [workspaceId]);

  const persistPosition = (next: Position) => {
    setPosition(next);
    window.localStorage.setItem(`falbor-pet-position:${workspaceId}`, JSON.stringify(next));
  };

  const stopDragging = () => {
    dragRef.current = null;
    setDragging(false);
  };

  if (!visible) return null;

  const video = mode === "red" ? "/icons/pets/red_AgentPet.mp4" : mode === "blue" ? "/icons/pets/blue_AgentPet.mp4" : mode === "green" ? "/icons/pets/green_AgentPet.mp4" : null;

  return (
    <div
      className="fixed z-[100] select-none touch-none"
      style={{ right: position.x, bottom: position.y }}
      onPointerEnter={() => { setHovered(true); setIndex((value) => (value + 1) % PET_IMAGES.length); }}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragged.current = false;
        setDragging(true);
        dragRef.current = {
          offsetX: event.clientX - (window.innerWidth - position.x - PET_SIZE),
          offsetY: event.clientY - (window.innerHeight - position.y - PET_SIZE),
        };
      }}
      onPointerMove={(event) => {
        if (!dragging || !dragRef.current) return;
        dragged.current = true;
        const nextX = Math.max(8, Math.min(window.innerWidth - PET_SIZE - 8, window.innerWidth - event.clientX + dragRef.current.offsetX - PET_SIZE));
        const nextY = Math.max(8, Math.min(window.innerHeight - PET_SIZE - 8, window.innerHeight - event.clientY + dragRef.current.offsetY - PET_SIZE));
        persistPosition({ x: nextX, y: nextY });
      }}
      onPointerUp={(event) => {
        if (!dragged.current) setIndex((value) => (value + 1) % PET_IMAGES.length);
        event.currentTarget.releasePointerCapture(event.pointerId);
        stopDragging();
      }}
      onPointerCancel={stopDragging}
    >
      <button
        type="button"
        aria-label="Workspace pet"
        className={`flex h-32 w-32 items-center justify-center overflow-hidden border-0 bg-transparent p-0 shadow-none ${dragging ? "scale-105 cursor-grabbing" : "cursor-pointer hover:scale-105"}`}
      >
        {video ? <video src={video} autoPlay loop muted playsInline className="h-full w-full object-contain" /> : <img src={PET_IMAGES[hovered ? (index + 1) % PET_IMAGES.length : index]} alt="" className="h-full w-full object-contain" style={{ transition: "none" }} draggable={false} />}
      </button>
    </div>
  );
}
