import React from "react";
import * as Icons from "lucide-react";
import { describeWmo } from "../utils/wmo";

// Render a lucide icon by name from a WMO code. Safely falls back to Cloud.
export default function WeatherIcon({ code, isDay = true, className, size = 32, ...rest }) {
  const desc = describeWmo(code);
  let name = desc.icon;
  // Swap "Sun" for "Moon" at night to feel right
  if (!isDay && (name === "Sun" || name === "CloudSun")) name = name === "Sun" ? "Moon" : "CloudMoon";
  const Cmp = Icons[name] || Icons.Cloud;
  return <Cmp className={className} size={size} {...rest} />;
}
