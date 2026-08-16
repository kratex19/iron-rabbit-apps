import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Sun, HardDriveDownload, CalendarDays, Car, Settings as SettingsIcon } from "lucide-react";

// Bottom tab bar — always visible so users can navigate between dashboard pages.
export default function DashboardTabBar() {
  const items = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, end: true, testid: "dash-tab-dashboard" },
    { to: "/dashboard/weather", label: "Weather", Icon: Sun, testid: "dash-tab-weather" },
    { to: "/dashboard/saved-weather", label: "Saved", Icon: HardDriveDownload, testid: "dash-tab-saved" },
    { to: "/dashboard/events", label: "Events", Icon: CalendarDays, testid: "dash-tab-events" },
    { to: "/dashboard/traffic", label: "Traffic", Icon: Car, testid: "dash-tab-traffic" },
    { to: "/dashboard/settings", label: "Settings", Icon: SettingsIcon, testid: "dash-tab-settings" },
  ];
  return (
    <nav className="ir-dash-tabbar" aria-label="Dashboard sections" data-testid="dashboard-tabbar">
      {items.map(({ to, label, Icon, end, testid }) => (
        <NavLink key={to} to={to} end={end} data-testid={testid}
          className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
