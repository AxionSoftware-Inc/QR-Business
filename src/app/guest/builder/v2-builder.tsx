"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createV2QRCode,
  createV2Site,
  createV2Tenant,
  getV2Site,
  listV2QRCodes,
  publishV2Site,
  saveV2Draft,
  uploadV2Image,
  type V2Site,
} from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";
import {
  buildDraftFromSite,
  buildGuestSite,
  defaultGuestDraft,
  getDraftForPlan,
  normalizeSlug,
  type GuestDraft,
  type GuestPlan,
} from "@/modules/guest/guest-site-factory";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import type { PublishedSite, SiteBlock, SiteTheme } from "@/modules/sites/types";

const localDraftKey = "qr-business-v2-builder-draft";
type Panel = "basics" | "theme" | "services" | "gallery" | "testimonials" | "advanced";

export function V2Builder({ initialPlan, siteId, tenantId }: { initialPlan: GuestPlan; siteId?: string; tenantId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GuestDraft>(() => getDraftForPlan(initialPlan, defaultGuestDraft));
  const [remoteSite, setRemoteSite] = useState<V2Site | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "publishing" | "signed-out" | "error">("loading");
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<Panel>("basics");

  useEffect(() => {
    void (async () => {
      const session = getCachedV2User() ? { user: getCachedV2User() } : await refreshV2Session();
      if (!session?.user) { setStatus("signed-out"); return; }
      if (tenantId && !session.user.memberships.some((m) => m.tenant_id === tenantId) && !session.user.is_staff) {
        setMessage("Tanlangan workspace uchun membership topilmadi."); setStatus("error"); return;
      }
      if (siteId) {
        try {
          const site = await getV2Site(siteId);
          if (tenantId && site.tenant !== tenantId) throw new Error("Site boshqa workspace’ga tegishli.");
          setRemoteSite(site);
          const converted = convertV2Site(site);
          if (converted) setDraft(buildDraftFromSite(converted));
          setStatus("ready");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Sayt topilmadi."); setStatus("error"); }
        return;
      }
      try {
        const raw = window.localStorage.getItem(localDraftKey);
        if (raw) setDraft(getDraftForPlan(initialPlan, JSON.parse(raw) as GuestDraft));
      } catch { window.localStorage.removeItem(localDraftKey); }
      setStatus("ready");
    })();
  }, [initialPlan, siteId, tenantId]);

  const preview = useMemo(() => buildGuestSite(draft), [draft]);
  const slug = normalizeSlug(draft.slug || draft.businessName);
  const isValid = draft.businessName.trim().length >= 2 && slug.length >= 3;
  const busy = status === "saving" || status === "publishing" || Boolean(uploading);

  function persist(next: GuestDraft) { if (!siteId) window.localStorage.setItem(localDraftKey, JSON.stringify(next)); }
  function replace(next: GuestDraft) { setDraft(next); persist(next); setMessage(""); }
  function patch<K extends keyof GuestDraft>(key: K, value: GuestDraft[K]) {
    const next = { ...draft, [key]: value };
    if (key === "businessName" && !draft.slug) next.slug = normalizeSlug(String(value));
    if (key === "slug") next.slug = normalizeSlug(String(value));
    replace(next);
  }
  function toggleBlock(key: keyof GuestDraft["enabled"]) { patch("enabled", { ...draft.enabled, [key]: !draft.enabled[key] }); }
  function selectPlan(plan: GuestPlan) { replace(getDraftForPlan(plan, draft)); }
  function move<T>(items: T[], index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next; }

  async function ensureSite() {
    if (remoteSite) return remoteSite;
    const user = getCachedV2User();
    if (!user) throw new Error("Session topilmadi.");
    let selectedTenantId = tenantId || user.memberships[0]?.tenant_id;
    if (!selectedTenantId) {
      const tenant = await createV2Tenant({ name: draft.businessName.trim(), slug });
      selectedTenantId = tenant.id;
      await refreshV2Session();
    }
    const site = await createV2Site({ tenant: selectedTenantId, slug, name: draft.businessName.trim() });
    setRemoteSite(site);
    return site;
  }

  async function uploadImage(file: File | null, target: "cover" | string) {
    if (!file) return;
    if (!isValid) { setMessage("Rasm yuklashdan oldin biznes nomi va slugni kiriting."); return; }
    setUploading(target);
    try {
      const site = await ensureSite();
      const asset = await uploadV2Image({ tenant: site.tenant, file, alt: target === "cover" ? `${draft.businessName} cover` : `${draft.businessName} gallery` });
      if (target === "cover") patch("coverUrl", asset.url);
      else patch("galleryImages", draft.galleryImages.map((image) => image.id === target ? { ...image, url: asset.url } : image));
      setMessage(`Rasm tekshirildi va saqlandi: ${asset.width}×${asset.height}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Rasm yuklanmadi."); }
    finally { setUploading(""); }
  }

  async function saveDraftOnly() {
    if (!isValid) { setMessage("Biznes nomi va kamida 3 belgili slug kerak."); return null; }
    setStatus("saving");
    try {
      const site = await ensureSite();
      const renderable = buildGuestSite({ ...draft, slug });
      await saveV2Draft(site.id, { title: renderable.title, description: renderable.description, template_key: renderable.templateKey, theme: renderable.theme as unknown as Record<string, unknown>, blocks: renderable.blocks as unknown[], seo: { title: renderable.title, description: renderable.description } });
      const refreshed = await getV2Site(site.id);
      setRemoteSite(refreshed);
      window.localStorage.removeItem(localDraftKey);
      setStatus("ready");
      setMessage("Draft yangi immutable version sifatida saqlandi.");
      return refreshed;
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Draft saqlanmadi."); return null; }
  }

  async function publish() {
    setStatus("publishing");
    const site = await saveDraftOnly();
    if (!site) return;
    setStatus("publishing");
    try {
      await publishV2Site(site.id);
      const existing = (await listV2QRCodes()).find((qr) => qr.site === site.id);
      if (!existing) await createV2QRCode({ tenant: site.tenant, site: site.id, label: site.name, campaign: "default" });
      window.localStorage.removeItem(localDraftKey);
      router.push("/guest/dashboard");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Publish bajarilmadi."); }
  }

  if (status === "loading") return <Shell><p className="text-sm text-slate-600">Builder yuklanmoqda...</p></Shell>;
  if (status === "signed-out") return <Shell><h1 className="text-3xl font-semibold">Builder uchun account kerak</h1><p className="mt-2 text-sm text-slate-600">Verified account tenant ownership uchun zarur.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href={`/login?next=${encodeURIComponent(`/guest/builder?plan=${initialPlan}`)}`}>Google bilan kirish</Link></Shell>;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef7f4_0%,#f6f7fb_34%,#eef1f6_100%)] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/90 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <div><Link className="text-sm font-semibold text-slate-500" href="/guest/dashboard">Workspace</Link><h1 className="mt-1 text-3xl font-semibold">Site Studio V2</h1><p className="mt-1 text-sm text-slate-500">Rich blocks · immutable drafts · atomic publish</p></div>
          <div className="flex gap-2"><button className="min-h-11 rounded-md bg-white px-4 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50" disabled={!isValid || busy} onClick={() => void saveDraftOnly()} type="button">{status === "saving" ? "Saqlanyapti..." : "Draft saqlash"}</button><button className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-400" disabled={!isValid || busy} onClick={() => void publish()} type="button">{status === "publishing" ? "Publish..." : "Publish"}</button></div>
        </header>
        {message ? <p className="mt-4 rounded-md bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">{message}</p> : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[190px_470px_1fr]">
          <nav className="h-fit rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5">
            {([['basics','Asosiy'],['theme','Dizayn'],['services','Xizmatlar'],['gallery','Galereya'],['testimonials','Fikrlar'],['advanced','Bloklar']] as Array<[Panel,string]>).map(([id,label]) => <button className={panel === id ? "mb-1 w-full rounded-lg bg-slate-950 px-3 py-3 text-left text-sm font-semibold text-white" : "mb-1 w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"} key={id} onClick={() => setPanel(id)} type="button">{label}</button>)}
          </nav>

          <section className="h-fit space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            {panel === "basics" ? <>
              <EditorTitle title="Asosiy ma’lumot" />
              <Field label="Biznes nomi" value={draft.businessName} onChange={(v) => patch("businessName", v)} /><Field label="Public slug" value={draft.slug} onChange={(v) => patch("slug", v)} /><Field label="Kategoriya" value={draft.category} onChange={(v) => patch("category", v)} /><Area label="Tavsif" value={draft.description} onChange={(v) => patch("description", v)} />
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Telefon" value={draft.phone} onChange={(v) => patch("phone", v)} /><Field label="Telegram" value={draft.telegram} onChange={(v) => patch("telegram", v)} /><Field label="Instagram" value={draft.instagram} onChange={(v) => patch("instagram", v)} /><Field label="WhatsApp" value={draft.whatsapp} onChange={(v) => patch("whatsapp", v)} /><Field label="Website" value={draft.website} onChange={(v) => patch("website", v)} /><Field label="Manzil" value={draft.address} onChange={(v) => patch("address", v)} /></div>
              <Field label="Map URL" value={draft.mapUrl} onChange={(v) => patch("mapUrl", v)} />
              <Field label="Cover URL" value={draft.coverUrl} onChange={(v) => patch("coverUrl", v)} />
              <FileUpload label="Cover rasm" busy={uploading === "cover"} onFile={(file) => void uploadImage(file, "cover")} />
            </> : null}

            {panel === "theme" ? <>
              <EditorTitle title="Dizayn va template" />
              <div className="grid grid-cols-3 gap-2">{(["oddiy","plus","pro"] as GuestPlan[]).map((plan) => <button className={draft.plan === plan ? "rounded-md bg-slate-950 px-3 py-3 text-sm font-semibold text-white" : "rounded-md bg-slate-50 px-3 py-3 text-sm font-semibold ring-1 ring-black/5"} key={plan} onClick={() => selectPlan(plan)} type="button">{plan}</button>)}</div>
              <div className="grid gap-3 sm:grid-cols-2"><ColorField label="Primary" value={draft.primaryColor} onChange={(v) => patch("primaryColor", v)} /><ColorField label="Accent" value={draft.accentColor} onChange={(v) => patch("accentColor", v)} /></div>
              <p className="text-xs leading-5 text-slate-500">Template default bloklarni sozlaydi; keyin har blokni alohida yoqish/o‘chirish mumkin.</p>
            </> : null}

            {panel === "services" ? <>
              <EditorTitle title="Xizmatlar" action={<button className="text-sm font-semibold text-teal-700" onClick={() => patch("services", [...draft.services, { id: crypto.randomUUID(), name: "", description: "", price: "" }])} type="button">+ Qo‘shish</button>} />
              <Toggle label="Blok ko‘rinsin" checked={draft.enabled.services} onChange={() => toggleBlock("services")} /><Field label="Sarlavha" value={draft.servicesTitle} onChange={(v) => patch("servicesTitle", v)} />
              {draft.services.map((item,index) => <RepeaterCard key={item.id} index={index} count={draft.services.length} onMove={(d) => patch("services", move(draft.services,index,d))} onRemove={() => patch("services", draft.services.filter((x) => x.id !== item.id))}><Field label="Nomi" value={item.name} onChange={(v) => patch("services", draft.services.map((x) => x.id === item.id ? { ...x, name:v } : x))} /><Field label="Narx" value={item.price} onChange={(v) => patch("services", draft.services.map((x) => x.id === item.id ? { ...x, price:v } : x))} /><Area label="Tavsif" value={item.description} onChange={(v) => patch("services", draft.services.map((x) => x.id === item.id ? { ...x, description:v } : x))} /></RepeaterCard>)}
            </> : null}

            {panel === "gallery" ? <>
              <EditorTitle title="Galereya" action={<button className="text-sm font-semibold text-teal-700" onClick={() => patch("galleryImages", [...draft.galleryImages, { id: crypto.randomUUID(), url:"", alt:"" }])} type="button">+ Rasm</button>} />
              <Toggle label="Blok ko‘rinsin" checked={draft.enabled.gallery} onChange={() => toggleBlock("gallery")} /><Field label="Sarlavha" value={draft.galleryTitle} onChange={(v) => patch("galleryTitle", v)} />
              {draft.galleryImages.map((item,index) => <RepeaterCard key={item.id} index={index} count={draft.galleryImages.length} onMove={(d) => patch("galleryImages", move(draft.galleryImages,index,d))} onRemove={() => patch("galleryImages", draft.galleryImages.filter((x) => x.id !== item.id))}><Field label="URL" value={item.url} onChange={(v) => patch("galleryImages", draft.galleryImages.map((x) => x.id === item.id ? { ...x, url:v } : x))} /><Field label="Alt text" value={item.alt} onChange={(v) => patch("galleryImages", draft.galleryImages.map((x) => x.id === item.id ? { ...x, alt:v } : x))} /><FileUpload label="Rasm yuklash" busy={uploading === item.id} onFile={(file) => void uploadImage(file,item.id)} /></RepeaterCard>)}
            </> : null}

            {panel === "testimonials" ? <>
              <EditorTitle title="Mijozlar fikri" action={<button className="text-sm font-semibold text-teal-700" onClick={() => patch("testimonials", [...draft.testimonials, { id:crypto.randomUUID(), name:"", text:"" }])} type="button">+ Fikr</button>} />
              <Toggle label="Blok ko‘rinsin" checked={draft.enabled.testimonials} onChange={() => toggleBlock("testimonials")} /><Field label="Sarlavha" value={draft.testimonialsTitle} onChange={(v) => patch("testimonialsTitle", v)} />
              {draft.testimonials.map((item,index) => <RepeaterCard key={item.id} index={index} count={draft.testimonials.length} onMove={(d) => patch("testimonials", move(draft.testimonials,index,d))} onRemove={() => patch("testimonials", draft.testimonials.filter((x) => x.id !== item.id))}><Field label="Mijoz" value={item.name} onChange={(v) => patch("testimonials", draft.testimonials.map((x) => x.id === item.id ? { ...x, name:v } : x))} /><Area label="Fikr" value={item.text} onChange={(v) => patch("testimonials", draft.testimonials.map((x) => x.id === item.id ? { ...x, text:v } : x))} /></RepeaterCard>)}
            </> : null}

            {panel === "advanced" ? <AdvancedEditor draft={draft} patch={patch} toggleBlock={toggleBlock} /> : null}
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-600"><span>Live preview</span><span>/{slug || "slug"}</span></div><div className="max-h-[calc(100vh-110px)] overflow-auto bg-slate-100 p-3"><div className="mx-auto max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl"><PublicSiteRenderer site={{ ...preview, tenantSlug: "preview", siteSlug: slug || "site", status: "published" }} /></div></div></section>
        </div>
      </div>
    </main>
  );
}

function AdvancedEditor({ draft, patch, toggleBlock }: { draft: GuestDraft; patch: <K extends keyof GuestDraft>(key:K,value:GuestDraft[K])=>void; toggleBlock:(key:keyof GuestDraft["enabled"])=>void }) {
  return <>
    <EditorTitle title="Qo‘shimcha bloklar" />
    <BlockBox title="Highlights" enabled={draft.enabled.highlights} onToggle={() => toggleBlock("highlights")}><Field label="Sarlavha" value={draft.highlightsTitle} onChange={(v)=>patch("highlightsTitle",v)} />{draft.highlights.map((item) => <div className="mt-2 grid grid-cols-2 gap-2" key={item.id}><Field label="Label" value={item.label} onChange={(v)=>patch("highlights",draft.highlights.map((x)=>x.id===item.id?{...x,label:v}:x))}/><Field label="Value" value={item.value} onChange={(v)=>patch("highlights",draft.highlights.map((x)=>x.id===item.id?{...x,value:v}:x))}/></div>)}</BlockBox>
    <BlockBox title="Promo CTA" enabled={draft.enabled.promo} onToggle={() => toggleBlock("promo")}><Field label="Sarlavha" value={draft.promoTitle} onChange={(v)=>patch("promoTitle",v)}/><Area label="Tavsif" value={draft.promoDescription} onChange={(v)=>patch("promoDescription",v)}/><div className="grid gap-2 sm:grid-cols-2"><Field label="Button" value={draft.promoActionLabel} onChange={(v)=>patch("promoActionLabel",v)}/><Field label="URL" value={draft.promoActionUrl} onChange={(v)=>patch("promoActionUrl",v)}/></div></BlockBox>
    <BlockBox title="Process" enabled={draft.enabled.process} onToggle={() => toggleBlock("process")}><Field label="Sarlavha" value={draft.processTitle} onChange={(v)=>patch("processTitle",v)}/>{draft.process.map((item)=><div className="mt-3 rounded-md bg-white p-3 ring-1 ring-black/5" key={item.id}><div className="grid grid-cols-[90px_1fr] gap-2"><Field label="Step" value={item.step} onChange={(v)=>patch("process",draft.process.map((x)=>x.id===item.id?{...x,step:v}:x))}/><Field label="Title" value={item.title} onChange={(v)=>patch("process",draft.process.map((x)=>x.id===item.id?{...x,title:v}:x))}/></div><Area label="Tavsif" value={item.description} onChange={(v)=>patch("process",draft.process.map((x)=>x.id===item.id?{...x,description:v}:x))}/></div>)}</BlockBox>
    <BlockBox title="FAQ" enabled={draft.enabled.faq} onToggle={() => toggleBlock("faq")}><Field label="Sarlavha" value={draft.faqTitle} onChange={(v)=>patch("faqTitle",v)}/>{draft.faq.map((item)=><div className="mt-3 rounded-md bg-white p-3 ring-1 ring-black/5" key={item.id}><Field label="Savol" value={item.question} onChange={(v)=>patch("faq",draft.faq.map((x)=>x.id===item.id?{...x,question:v}:x))}/><Area label="Javob" value={item.answer} onChange={(v)=>patch("faq",draft.faq.map((x)=>x.id===item.id?{...x,answer:v}:x))}/></div>)}</BlockBox>
    <BlockBox title="Ish vaqti" enabled={draft.enabled.hours} onToggle={() => toggleBlock("hours")}><Field label="Sarlavha" value={draft.hoursTitle} onChange={(v)=>patch("hoursTitle",v)}/>{draft.hours.map((row,index)=><div className="mt-2 grid grid-cols-2 gap-2" key={`${row.day}-${index}`}><Field label="Kun" value={row.day} onChange={(v)=>patch("hours",draft.hours.map((x,i)=>i===index?{...x,day:v}:x))}/><Field label="Vaqt" value={row.value} onChange={(v)=>patch("hours",draft.hours.map((x,i)=>i===index?{...x,value:v}:x))}/></div>)}</BlockBox>
    <BlockBox title="Location" enabled={draft.enabled.location} onToggle={() => toggleBlock("location")}><Field label="Sarlavha" value={draft.locationTitle} onChange={(v)=>patch("locationTitle",v)}/><Field label="Manzil" value={draft.address} onChange={(v)=>patch("address",v)}/><Field label="Map URL" value={draft.mapUrl} onChange={(v)=>patch("mapUrl",v)}/></BlockBox>
  </>;
}

function EditorTitle({ title, action }: { title:string; action?:React.ReactNode }) { return <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2>{action}</div>; }
function Field({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) { return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span><input className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-600" onChange={(e)=>onChange(e.target.value)} value={value}/></label>; }
function Area({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) { return <label className="mt-2 grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span><textarea className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600" onChange={(e)=>onChange(e.target.value)} value={value}/></label>; }
function ColorField({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) { return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span><div className="flex gap-2"><input className="h-10 w-12 rounded border border-slate-200" onChange={(e)=>onChange(e.target.value)} type="color" value={value}/><input className="min-h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm" onChange={(e)=>onChange(e.target.value)} value={value}/></div></label>; }
function Toggle({ label, checked, onChange }: { label:string; checked:boolean; onChange:()=>void }) { return <label className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-black/5"><span>{label}</span><input checked={checked} onChange={onChange} type="checkbox"/></label>; }
function FileUpload({ label, busy, onFile }: { label:string; busy:boolean; onFile:(f:File|null)=>void }) { return <label className="grid gap-1.5 rounded-md bg-slate-50 p-3 ring-1 ring-black/5"><span className="text-xs font-semibold text-slate-500">{label}</span><input accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e)=>onFile(e.target.files?.[0]??null)} type="file"/><span className="text-xs text-slate-500">JPEG/PNG/WebP · max 8 MB</span></label>; }
function RepeaterCard({ children,index,count,onMove,onRemove }: { children:React.ReactNode; index:number; count:number; onMove:(d:-1|1)=>void; onRemove:()=>void }) { return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-black/5"><div className="mb-3 flex justify-end gap-2"><button disabled={index===0} onClick={()=>onMove(-1)} type="button">↑</button><button disabled={index===count-1} onClick={()=>onMove(1)} type="button">↓</button><button className="text-xs font-semibold text-rose-600" onClick={onRemove} type="button">O‘chirish</button></div><div className="space-y-2">{children}</div></div>; }
function BlockBox({ title,enabled,onToggle,children }: { title:string; enabled:boolean; onToggle:()=>void; children:React.ReactNode }) { return <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{title}</h3><input checked={enabled} onChange={onToggle} type="checkbox"/></div>{children}</div>; }
function Shell({ children }: { children:React.ReactNode }) { return <main className="grid min-h-screen place-items-center bg-slate-100 px-4"><section className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">{children}</section></main>; }

function convertV2Site(site: V2Site): PublishedSite | null {
  const version = site.draft ?? site.published;
  if (!version) return null;
  const plan: GuestPlan = version.template_key === "oddiy" || version.template_key === "plus" || version.template_key === "pro" ? version.template_key : "plus";
  return {
    id: site.id,
    tenantId: site.tenant,
    tenantSlug: "workspace-preview",
    siteSlug: site.slug,
    title: version.title,
    description: version.description,
    templateKey: plan,
    status: site.status,
    theme: version.theme as unknown as SiteTheme,
    blocks: version.blocks as SiteBlock[],
    publishedAt: site.published_at ?? version.created_at,
    showPlatformBranding: true,
  };
}
