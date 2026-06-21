"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Compass, PlaySquare, Mic, Users, Sparkles, ShoppingBag, Bell, MessageCircle, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/reels", label: "Reels", icon: PlaySquare },
  { href: "/spaces", label: "Spaces", icon: Mic },
  { href: "/collab", label: "Collab", icon: Users },
  { href: "/ai-studio", label: "AI Studio", icon: Sparkles },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const logout = useAuth((s) => s.logout);

  return (
    <aside className="w-[220px] shrink-0 bg-bg2 border-r border-border flex flex-col gap-1 p-3">
      <Link href="/" className="text-[22px] font-extrabold gradient-text tracking-tight px-3 pb-5 pt-2">
        Nexus
      </Link>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors border ${
              active
                ? "bg-accent/15 text-accent border-accent/30"
                : "text-txt2 border-transparent hover:bg-bg3 hover:text-txt"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}

      <div className="mt-auto pt-3 border-t border-border">
        {profile ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-bg3 cursor-pointer">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              onClick={() => router.push(`/profile/${profile.username}`)}
            >
              {profile.avatar_emoji}
            </div>
            <div className="flex-1 min-w-0" onClick={() => router.push(`/profile/${profile.username}`)}>
              <div className="text-[13px] font-semibold truncate">{profile.display_name}</div>
              <div className="text-[11px] text-txt2 truncate">@{profile.username}</div>
            </div>
            <button onClick={() => logout()} title="Log out" className="text-txt2 hover:text-txt">
              <Settings size={16} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block text-center text-sm font-semibold py-2.5 rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
          >
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}
