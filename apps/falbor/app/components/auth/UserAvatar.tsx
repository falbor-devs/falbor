"use client";

import { useAuth } from "~/hooks/useAuth";
import { useStore } from "@nanostores/react";
import { profileStore } from "~/lib/stores/profile";
import { AvatarDropdown } from "../@settings/core/AvatarDropdown";
import type { TabType } from "../@settings/core/types";

interface UserAvatarProps {
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export function UserAvatar({ onOpenProfile, onOpenSettings }: UserAvatarProps) {
  const { user, logout } = useAuth();
  const profile = useStore(profileStore);

  if (!user) return null;

  const handleSelectTab = async (tab: TabType) => {
    switch (tab) {
      case "profile":
        onOpenProfile?.();
        break;

      case "settings":
        onOpenSettings?.();
        break;

      case "logout":
        await logout();
        window.location.href = "/";
        break;

      default:
        break;
    }
  };

  return (
    <div className="flex items-center gap-3 ml-2">
      <AvatarDropdown onSelectTab={handleSelectTab} />
    </div>
  );
}