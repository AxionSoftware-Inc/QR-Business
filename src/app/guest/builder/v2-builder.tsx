"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createV2QRCode,
  createV2Site,
  createV2Tenant,
  getV2Site,
  listV2QRCodes,
  publishV2Site,
  saveV2Draft,
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

export function V2Builder({ initialPlan, siteId }: { initialPlan: GuestPlan; siteId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GuestDraft>(() => getDraftForPlan(initialPlan, defaultGuestDraft));
  const [remoteSite, setRemoteSite] = useState<V2Site | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "publishing" | "signed-out" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const session = getCachedV2User() ? { user: getCachedV2User() } : await refreshV2Session();
      if (!session?.user) {
        setStatus("signed-out");
        return;
      }

      if (siteId) {
        try {
          const site = await getV2Site(siteId);
          setRemoteSite(site);
          const converted = convertV2Site(site);
          if (converted) setDraft(buildDraftFromSite(converted));
          setStatus("ready");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Sayt topilmadi.");
          setStatus("error");
        }
        return;
      }

      try {
        const raw = window.localStorage.getItem(localDraftKey);
        if (raw) setDraft(getDraftForPlan(initialPlan, JSON.parse(raw) as GuestDraft));
      } catch {
        window.localStorage.removeItem(localDraftKey);
      }
      setStatus("ready");
    })();
  }, [initialPlan, siteId]);

  const preview = useMemo(() => buildGuestSite(draft), [draft]);
  const slug = normalizeSlug(draft.slug || draft.businessName);
  const isValid = draft.businessName.trim().length >= 2 && slug.length >= 3;

  function patch<K extends keyof GuestDraft>(key: K, value: GuestDraft[K]) {
    const next = { ...draft, [key]: value };
    if (key === "businessName" && !draft.slug) next.slug = normalizeSlug(String(value));
    if (key === "slug") next.slug = normalizeSlug(String(value));
    setDraft(next);
    if (!siteId) window.localStorage.setItem(localDraftKey, JSON.stringify(next));
    setMessage("");
  }

  function updateService(index: number, key: "name" | "description" | "price", value: string) {
    const services = draft.services.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item);
    patch("services", services);
  }

  async function ensureSite() {
    if (remoteSite) return remoteSite;
    const user = getCachedV2User();
    if (!user) throw new Error("Session topilmadi.");

    let tenantId = user.memberships[0]?.tenant_id;
    if (!tenantId) {
      const tenant = await createV2Tenant({ name: draft.businessName.trim(), slug });
      tenantId = tenant.id;
      await refreshV2Session();
    }
    const site = await createV2Site({ tenant: tenantId, slug, name: draft.businessName.trim() });
    setRemoteSite(site);
    return site;
  }

  async function saveDraftOnly() {
    if (!isValid) {
      setMessage("Biznes nomi va kamida 3 belgili slug kerak.");
      return null;
    }
    setStatus("saving");
    try {
      const site = await ensureSite();
      const renderable = buildGuestSite({ ...draft, slug });
      await saveV2Draft(site.id, {
        title: renderable.title,
        description: renderable.description,
        template_key: renderable.templateKey,
        theme: renderable.theme as unknown as Record<string, unknown>,
        blocks: renderable.blocks as unknown[],
        seo: { title: renderable.title, description: renderable.description },
      });
      const refreshedSite = await getV2Site(site.id);
      setRemoteSite(refreshedSite);
      window.localStorage.removeItem(localDraftKey);
      setStatus("ready");
      setMessage("Draft serverda yangi immutable version sifatida saqlandi.");
      return refreshedSite;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Draft saqlanmadi.");
      return null;
    }
  }

  async function publish() {
    setStatus("publishing");
    const site = await saveDraftOnly();
    if (!site) return;
    setStatus("publishing");
    try {
      await publishV2Site(site.id);
      const existingQr = (await listV2QRCodes()).find((qr) => qr.site === site.id);
      if (!existingQr) {
        await createV2QRCode({ tenant: site.tenant, site: site.id, label: site.name, campaign: "default" });
      }
      window.localStorage.removeItem(localDraftKey);
      router.push("/guest/dashboard");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Publish bajarilmadi.");
    }
  }

  if (status === "loading") {
    return <Shell><p className="text-sm text-slate-600">Builder yuklanmoqda...</p></Shell>;
  }

  if (status === "signed-out") {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold">Builder uchun account kerak</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">V2 publish anonymous recovery token orqali ishlamaydi. Verified account tenant ownership uchun zarur.</p>
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href={`/login?next=${encodeURIComponent(`/guest/builder?plan=${initialPlan}`)}`}>
          Google bilan kirish
        </Link>
      </Shell>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef7f4_0%,#f6f7fb_34%,#eef1f6_100%)] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/85 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <div>
            <Link className="text-sm font-semibold text-slate-500" href="/guest/dashboard">Workspace</Link>
            <h1 className="mt-1 text-3xl font-semibold">Site Studio V2</h1>
            <p className="mt-1 text-sm text-slate-500">Draft alohida saqlanadi; publish live snapshotni atomik almashtiradi.</p>
          </div>
          <div className="flex gap-2">
            <button className="min-h-11 rounded-md bg-white px-4 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50" disabled={!isValid || status === "saving" || status === "publishing"} onClick={() => void saveDraftOnly()} type="button">
              {status === "saving" ? "Saqlanyapti..." : "Draft saqlash"}
            </button>
            <button className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-400" disabled={!isValid || status === "saving" || status === "publishing"} onClick={() => void publish()} type="button">
              {status === "publishing" ? "Publish..." : "Publish"}
            </button>
          </div>
        </header>

        {message ? <p className="mt-4 rounded-md bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">{message}</p> : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[430px_1fr]">
          <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-semibold">Kontent</h2>
            <Field label="Biznes nomi" value={draft.businessName} onChange={(value) => patch("businessName", value)} />
            <Field label="Public slug" value={draft.slug} onChange={(value) => patch("slug", value)} />
            <Field label="Kategoriya" value={draft.category} onChange={(value) => patch("category", value)} />
            <Area label="Tavsif" value={draft.description} onChange={(value) => patch("description", value)} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefon" value={draft.phone} onChange={(value) => patch("phone", value)} />
              <Field label="Telegram" value={draft.telegram} onChange={(value) => patch("telegram", value)} />
              <Field label="Instagram" value={draft.instagram} onChange={(value) => patch("instagram", value)} />
              <Field label="WhatsApp" value={draft.whatsapp} onChange={(value) => patch("whatsapp", value)} />
              <Field label="Website" value={draft.website} onChange={(value) => patch("website", value)} />
              <Field label="Cover URL" value={draft.coverUrl} onChange={(value) => patch("coverUrl", value)} />
            </div>

            <div>
              <p className="text-sm font-semibold">Template</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["oddiy", "plus", "pro"] as GuestPlan[]).map((plan) => (
                  <button className={draft.plan === plan ? "rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white" : "rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-black/5"} key={plan} onClick={() => setDraft(getDraftForPlan(plan, draft))} type="button">{plan}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Xizmatlar</p>
                <button className="text-sm font-semibold text-teal-700" onClick={() => patch("services", [...draft.services, { id: `service_${Date.now()}`, name: "", description: "", price: "" }])} type="button">+ Qo‘shish</button>
              </div>
              <div className="mt-2 space-y-3">
                {draft.services.map((service, index) => (
                  <div className="rounded-md bg-slate-50 p-3 ring-1 ring-black/5" key={service.id}>
                    <Field label="Nomi" value={service.name} onChange={(value) => updateService(index, "name", value)} />
                    <div className="mt-2"><Field label="Narx" value={service.price ?? ""} onChange={(value) => updateService(index, "price", value)} /></div>
                    <div className="mt-2"><Area label="Tavsif" value={service.description ?? ""} onChange={(value) => updateService(index, "description", value)} /></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">Live preview · /{slug || "slug"}</div>
            <div className="max-h-[calc(100vh-160px)] overflow-auto bg-slate-100 p-3">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
                <PublicSiteRenderer site={{ ...preview, tenantSlug: slug, status: "published" }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function convertV2Site(site: V2Site): PublishedSite | null {
  const version = site.draft ?? site.published;
  if (!version) return null;
  const plan: GuestPlan = version.template_key === "oddiy" || version.template_key === "plus" || version.template_key === "pro" ? version.template_key : "plus";
  return {
    id: site.id,
    tenantId: site.tenant,
    title: version.title,
    description: version.description,
    templateKey: plan,
    status: site.status,
    theme: version.theme as unknown as SiteTheme,
    blocks: version.blocks as SiteBlock[],
    publishedAt: site.published_at ?? version.created_at,
  };
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span><input className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-600" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span><textarea className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-4"><section className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">{children}</section></main>;
}
