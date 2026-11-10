"use client";
import { useEffect } from "react";

export function ColorMode() {
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-color-scheme: dark)");
    const update=()=>document.documentElement.classList.toggle("dark",preference.matches);
    update();preference.addEventListener("change",update);
    return()=>preference.removeEventListener("change",update);
  },[]);
  return null;
}
