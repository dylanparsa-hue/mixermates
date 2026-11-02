"use client";
import { useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
export function ComingMotion({children}:{children:ReactNode}) {
  const [paused,setPaused] = useState(false);
  return <div className="coming-art" data-paused={paused}>
    {children}
    <button className="coming-motion-toggle" type="button" aria-pressed={paused} aria-label={paused ? "Resume ambient motion" : "Pause ambient motion"} onClick={()=>setPaused(!paused)}>
      {paused ? <Play size={13} aria-hidden="true"/> : <Pause size={13} aria-hidden="true"/>}
      <span>{paused ? "Resume motion" : "Pause motion"}</span>
    </button>
  </div>;
}
