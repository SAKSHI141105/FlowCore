"use client";

import React, { useState, useEffect, useRef } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  revealDelay?: number;
  className?: string;
  scrambleCharacters?: string;
  animateOn?: "hover" | "mount" | "all";
}

export default function DecryptedText({
  text,
  speed = 40,
  revealDelay = 30,
  className = "",
  scrambleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+-/<>[]{}",
  animateOn = "all",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDecryption = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsDecrypting(true);

    let iterations = 0;
    const maxIterations = text.length;

    intervalRef.current = setInterval(() => {
      let scrambled = "";
      for (let i = 0; i < maxIterations; i++) {
        if (i < iterations) {
          scrambled += text[i];
        } else {
          scrambled += scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
        }
      }

      setDisplayText(scrambled);

      if (iterations >= maxIterations) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsDecrypting(false);
      }

      iterations += 0.5;
    }, revealDelay);
  };

  useEffect(() => {
    if (animateOn === "mount" || animateOn === "all") {
      startDecryption();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  const handleMouseEnter = () => {
    if (animateOn === "hover" || animateOn === "all") {
      startDecryption();
    }
  };

  return (
    <span 
      onMouseEnter={handleMouseEnter} 
      className={`${className} ${isDecrypting ? "font-mono" : ""}`}
    >
      {displayText}
    </span>
  );
}
