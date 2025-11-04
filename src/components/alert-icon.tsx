"use client";

import {
  TrafficCone,
  CloudSun,
  Car,
  TriangleAlert,
  ShieldAlert,
  type LucideProps,
} from "lucide-react";
import type { Alert } from "@/lib/types";

const iconMap = {
  Traffic: TrafficCone,
  Weather: CloudSun,
  Accident: Car,
  "Road Hazard": TriangleAlert,
  Collision: ShieldAlert,
};

export function AlertIcon({
  type,
  ...props
}: { type: Alert["type"] } & LucideProps) {
  const Icon = iconMap[type];
  return Icon ? <Icon {...props} /> : null;
}
