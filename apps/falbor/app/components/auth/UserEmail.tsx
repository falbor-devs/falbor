import { useAuth } from "~/hooks/useAuth";
import { useStore } from "@nanostores/react";
import { profileStore } from "~/lib/stores/profile";

export function UserEmail() {
    const { user } = useAuth();
    const profile = useStore(profileStore);

    if (!user) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
        </div>
    );
}