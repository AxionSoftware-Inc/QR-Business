"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";

type VantaEffect = {
  destroy: () => void;
};

export default function AiVantaNet() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const effect = NET({
      el: hostRef.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 320,
      minWidth: 320,
      scale: 1,
      scaleMobile: 1,
      backgroundAlpha: 0,
      color: 0x5a4020,
      points: 10,
      maxDistance: 20,
      spacing: 17,
      showDots: true,
    }) as VantaEffect;

    return () => {
      effect.destroy();
    };
  }, []);

  return <div className="vanta-free" ref={hostRef} />;
}
