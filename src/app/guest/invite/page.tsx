import { InviteClient } from "./invite-client";

type Props={searchParams:Promise<{token?:string}>};
export default async function InvitePage({searchParams}:Props){const {token}=await searchParams;return <main className="grid min-h-screen place-items-center bg-slate-100 px-4">{token?<InviteClient token={token}/>:<section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"><h1 className="text-2xl font-semibold">Invite token topilmadi</h1><p className="mt-2 text-sm text-slate-600">To‘liq invitation linkdan foydalaning.</p></section>}</main>}
