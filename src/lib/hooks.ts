"use client";
import { useSyncExternalStore } from "react";
const noop = () => () => {};
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
