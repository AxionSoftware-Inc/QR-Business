"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptV2TeamInvitation } from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";

export function InviteClient({ token }: { token:string }){
  const router=useRouter();
  const [state,setState]=useState<"loading"|"signed-out"|"accepting"|"error">("loading");
  const [message,setMessage]=useState("");
  useEffect(()=>{void(async()=>{const session=getCachedV2User()?{user:getCachedV2User()}:await refreshV2Session();if(!session?.user){setState("signed-out");return;}setState("accepting");try{await acceptV2TeamInvitation(token);await refreshV2Session();router.replace("/guest/dashboard");}catch(error){setMessage(error instanceof Error?error.message:"Invite qabul qilinmadi.");setState("error");}})()},[router,token]);
  if(state==="signed-out") return <Card><h1 className="text-2xl font-semibold">Team invitation</h1><p className="mt-2 text-sm text-slate-600">Taklifni qabul qilish uchun aynan taklif yuborilgan Google email bilan kiring.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href={`/login?next=${encodeURIComponent(`/guest/invite?token=${token}`)}`}>Google bilan kirish</Link></Card>;
  if(state==="error") return <Card><h1 className="text-2xl font-semibold">Invite qabul qilinmadi</h1><p className="mt-2 text-sm text-rose-700">{message}</p><Link className="mt-5 inline-flex text-sm font-semibold text-teal-700" href="/guest/dashboard">Workspace’ga qaytish</Link></Card>;
  return <Card><p className="text-sm text-slate-600">{state==="accepting"?"Taklif tekshirilib, membership yaratilmoqda...":"Session tekshirilmoqda..."}</p></Card>;
}
function Card({children}:{children:React.ReactNode}){return <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">{children}</section>}
