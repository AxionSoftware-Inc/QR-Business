import Link from "next/link";
import { GoogleUserPill } from "@/shared/ui/google-user-pill";
import { SettingsClient } from "./settings-client";

export default function WorkspaceSettingsPage(){return <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbf8_0%,#f6f7fb_42%,#eef1f7_100%)] px-4 py-5 text-slate-950 sm:px-6"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/85 p-5 shadow-sm ring-1 ring-black/5"><div><Link className="text-sm font-semibold text-slate-500" href="/guest/dashboard">← Workspace</Link><h1 className="mt-1 text-3xl font-semibold">Settings</h1><p className="mt-1 text-sm text-slate-500">Business profile, plan entitlements va team boshqaruvi.</p></div><GoogleUserPill/></header><div className="mt-6"><SettingsClient/></div></div></main>}
