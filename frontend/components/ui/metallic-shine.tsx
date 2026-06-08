"use client";

import React from "react";

interface MetallicShineProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export default function MetallicShine({
  children,
  className = "",
  as: Component = "div",
}: MetallicShineProps) {
  return (
    <Component className={`metallic-shine ${className}`}>
      {children}
    </Component>
  );
}
