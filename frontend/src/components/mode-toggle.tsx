"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { key: "light", label: "Light", icon: SunIcon },
  { key: "dark", label: "Dark", icon: MoonIcon },
  { key: "system", label: "System", icon: MonitorIcon },
] as const;

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const active = THEMES.find((item) => item.key === theme) ?? THEMES[2];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label="Toggle theme" />}>
        <ActiveIcon className="size-4" />
        <span className="hidden sm:inline">{active.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {THEMES.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.key} onClick={() => setTheme(item.key)}>
              <Icon className="size-4" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
