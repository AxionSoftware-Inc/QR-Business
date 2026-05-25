"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  checkSlugAvailableInBackend,
  createGuestSiteInBackend,
  updateGuestSiteInBackend,
  uploadMediaToBackend,
} from "@/modules/api/backend-client";
import {
  buildDraftFromSite,
  buildGuestPublicUrl,
  buildGuestSite,
  defaultGuestDraft,
  getDraftForPlan,
  guestPlanDetails,
  normalizeSlug,
  type GuestDraft,
  type GuestPlan,
} from "@/modules/guest/guest-site-factory";
import {
  getGuestOwnerContact,
  getGuestOwnerRecoveryCode,
  getGuestOwnerToken,
  saveGuestOwnerContact,
  saveGuestOwnerRecoveryCode,
  saveGuestOwnerToken,
} from "@/modules/guest/guest-session";
import { getGoogleUserSession } from "@/modules/auth/google-session";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import type { PublishedSite } from "@/modules/sites/types";
import { QrCode } from "@/shared/ui/qr-code";

const storageKey = "bm-guest-draft";
const createdSitesStorageKey = "bm-guest-created-sites";
const plans: GuestPlan[] = ["oddiy", "plus", "pro"];
const steps = [
  { id: 1, label: "Template", description: "Paket va dizayn yo'nalishi" },
  { id: 2, label: "Ma'lumot", description: "Biznes, aloqa va kontent" },
  { id: 3, label: "Publish", description: "Preview, QR va internetga qo'yish" },
] as const;

type GuestBuilderProps = {
  editingSite?: PublishedSite | null;
  initialPlan: GuestPlan;
};

export function GuestBuilder({ editingSite, initialPlan }: GuestBuilderProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<GuestDraft>(() =>
    editingSite
      ? buildDraftFromSite(editingSite)
      : getDraftForPlan(initialPlan, defaultGuestDraft),
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "creating" | "created" | "error"
  >("idle");
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "unknown"
  >("idle");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [step, setStep] = useState<(typeof steps)[number]["id"]>(1);
  const [ownerContact, setOwnerContact] = useState(() =>
    typeof window === "undefined" ? "" : getGuestOwnerContact(),
  );
  const [recoveryCode] = useState(() =>
    typeof window === "undefined" ? "" : getGuestOwnerRecoveryCode(),
  );
  const isEditing = Boolean(editingSite);
  const normalizedSlug = normalizeSlug(draft.slug);
  const hasRequiredFields =
    draft.businessName.trim().length >= 2 && normalizedSlug.length >= 3;
  const validationIssues = [
    draft.businessName.trim().length < 2
      ? "Biznes nomi kamida 2 ta belgi bo'lishi kerak."
      : null,
    normalizedSlug.length < 3
      ? "Link nomi kamida 3 ta belgi bo'lishi kerak."
      : null,
    !isEditing && slugStatus === "checking"
      ? "Link nomi hali tekshirilyapti."
      : null,
  ].filter((issue): issue is string => Boolean(issue));
  const validationWarnings = [
    !isEditing && slugStatus === "taken"
      ? "Bu link nomi band. Yaratishda avtomatik bo'sh variant beriladi."
      : null,
    !isEditing && slugStatus === "unknown"
      ? "Link tekshiruvi ishlamadi, lekin backend yaratishda qayta tekshiradi."
      : null,
  ].filter((issue): issue is string => Boolean(issue));
  const canCreate =
    hasRequiredFields &&
    (isEditing || slugStatus !== "checking") &&
    publishStatus !== "creating";
  const publishHint = !draft.businessName.trim()
    ? "Biznes nomini kiriting"
    : normalizedSlug.length < 3
      ? "Link nomi kamida 3 ta belgi bo'lsin"
      : isEditing
        ? "Tahrirga tayyor"
      : slugStatus === "checking"
        ? "Link nomi tekshirilyapti"
        : slugStatus === "taken"
          ? "Band bo'lsa avtomatik variant beriladi"
          : slugStatus === "unknown"
            ? "Backend yaratishda qayta tekshiradi"
          : "Tayyor";
  const hasAnyContact = Boolean(
    draft.phone.trim() ||
      draft.telegram.trim() ||
      draft.instagram.trim() ||
      draft.whatsapp.trim() ||
      draft.website.trim(),
  );
  const filledServicesCount = draft.services.filter((service) =>
    service.name.trim(),
  ).length;
  const filledGalleryCount = draft.galleryImages.filter((image) =>
    image.url.trim(),
  ).length;
  const filledTestimonialsCount = draft.testimonials.filter(
    (review) => review.name.trim() && review.text.trim(),
  ).length;
  const currentStep = steps.find((item) => item.id === step) ?? steps[0];

  useEffect(() => {
    const googleSession = getGoogleUserSession();
    if (!ownerContact && googleSession?.email) {
      window.setTimeout(() => {
        setOwnerContact(googleSession.email);
        saveGuestOwnerContact(googleSession.email);
      }, 0);
    }
  }, [ownerContact]);

  useEffect(() => {
    if (editingSite) {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as GuestDraft;
      window.setTimeout(() => {
        setDraft(getDraftForPlan(initialPlan, parsed));
      }, 0);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [editingSite, initialPlan]);

  const site = useMemo(() => buildGuestSite(draft), [draft]);
  const publishSite = useMemo(
    () =>
      editingSite
        ? {
            ...site,
            id: editingSite.id,
            tenantId: editingSite.tenantId,
            tenantSlug: editingSite.tenantSlug,
            ownerToken: editingSite.ownerToken,
            ownerContact: ownerContact || editingSite.ownerContact,
            publishedAt: editingSite.publishedAt,
          }
        : site,
    [editingSite, ownerContact, site],
  );
  const publicUrl = useMemo(() => buildGuestPublicUrl(draft.slug), [draft.slug]);

  useEffect(() => {
    const slug = normalizeSlug(draft.slug);

    if (!slug) {
      const timeout = window.setTimeout(() => setSlugStatus("idle"), 0);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      setSlugStatus("checking");
      checkSlugAvailableInBackend(slug).then((available) => {
        setSlugStatus(
          available === null ? "unknown" : available ? "available" : "taken",
        );
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft.slug]);

  function updateDraft(next: GuestDraft, resetSlugStatus = false) {
    setDraft(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSavedAt(new Date().toLocaleTimeString("uz-UZ"));
    setPublishStatus("idle");
    if (resetSlugStatus) {
      setSlugStatus("idle");
    }
  }

  function updateField<K extends keyof GuestDraft>(key: K, value: GuestDraft[K]) {
    const nextSlug =
      key === "businessName" && !draft.slug
        ? normalizeSlug(String(value))
        : key === "slug"
          ? normalizeSlug(String(value))
          : draft.slug;
    const next = {
      ...draft,
      [key]: value,
      slug: nextSlug,
    };
    updateDraft(next, nextSlug !== draft.slug);
  }

  function selectPlan(plan: GuestPlan) {
    updateDraft(getDraftForPlan(plan, draft), false);
  }

  function updateService(
    id: string,
    key: keyof GuestDraft["services"][number],
    value: string,
  ) {
    updateDraft({
      ...draft,
      services: draft.services.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    });
  }

  function addService() {
    updateDraft({
      ...draft,
      services: [
        ...draft.services,
        {
          id: `service_${Date.now()}`,
          name: "Yangi xizmat",
          description: "Qisqa tavsif",
          price: "Kelishiladi",
        },
      ],
    });
  }

  function removeService(id: string) {
    updateDraft({
      ...draft,
      services: draft.services.filter((item) => item.id !== id),
    });
  }

  function updateGalleryImage(
    id: string,
    key: keyof GuestDraft["galleryImages"][number],
    value: string,
  ) {
    updateDraft({
      ...draft,
      galleryImages: draft.galleryImages.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    });
  }

  function addGalleryImage() {
    updateDraft({
      ...draft,
      galleryImages: [
        ...draft.galleryImages,
        {
          id: `image_${Date.now()}`,
          url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
          alt: "Portfolio image",
        },
      ],
    });
  }

  function removeGalleryImage(id: string) {
    updateDraft({
      ...draft,
      galleryImages: draft.galleryImages.filter((item) => item.id !== id),
    });
  }

  function updateTestimonial(
    id: string,
    key: keyof GuestDraft["testimonials"][number],
    value: string,
  ) {
    updateDraft({
      ...draft,
      testimonials: draft.testimonials.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    });
  }

  function addTestimonial() {
    updateDraft({
      ...draft,
      testimonials: [
        ...draft.testimonials,
        {
          id: `review_${Date.now()}`,
          name: "Mijoz",
          text: "Xizmatdan mamnun bo'ldim.",
        },
      ],
    });
  }

  function removeTestimonial(id: string) {
    updateDraft({
      ...draft,
      testimonials: draft.testimonials.filter((item) => item.id !== id),
    });
  }

  async function uploadCover(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingField("cover");
    const url = await uploadMediaToBackend(file);
    setUploadingField(null);

    if (url) {
      updateField("coverUrl", url);
    }
  }

  async function uploadGalleryImage(id: string, file: File | null) {
    if (!file) {
      return;
    }

    setUploadingField(id);
    const url = await uploadMediaToBackend(file);
    setUploadingField(null);

    if (url) {
      updateGalleryImage(id, "url", url);
    }
  }

  function resetDraft() {
    const next = getDraftForPlan(initialPlan, defaultGuestDraft);
    setDraft(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSavedAt(null);
    setPublishStatus("idle");
  }

  async function createSite() {
    if (!canCreate) {
      setPublishStatus("error");
      return;
    }

    setPublishStatus("creating");
    const createdSite = editingSite
      ? await updateGuestSiteInBackend({
          ownerContact,
          recoveryCode,
          ownerToken: getGuestOwnerToken(),
          site: publishSite,
        })
      : await createGuestSiteInBackend({
          businessName: draft.businessName.trim(),
          slug: normalizedSlug,
          ownerToken: getGuestOwnerToken(),
          ownerContact,
          plan: draft.plan,
          site: publishSite,
        });

    if (!createdSite?.tenantSlug) {
      setPublishStatus("error");
      return;
    }

    if (createdSite.ownerToken) {
      saveGuestOwnerToken(createdSite.ownerToken);
    }
    if (createdSite.ownerRecoveryCode) {
      saveGuestOwnerRecoveryCode(createdSite.ownerRecoveryCode);
    }
    saveGuestOwnerContact(ownerContact);

    const createdSites = readCreatedSites();
    const nextSites = [
      createdSite,
      ...createdSites.filter((item) => item.id !== createdSite.id),
    ].slice(0, 12);
    window.localStorage.setItem(
      createdSitesStorageKey,
      JSON.stringify(nextSites),
    );
    window.localStorage.removeItem(storageKey);
    setPublishStatus("created");
    router.push(`/guest/success?slug=${createdSite.tenantSlug}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef7f4_0%,#f6f7fb_34%,#eef1f6_100%)] text-slate-950">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-xl bg-white/82 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-slate-500"
              href="/guest/dashboard"
            >
              Guest dashboard
            </Link>
            <h1 className="mt-1 text-3xl font-semibold">Guest builder</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {editingSite
                ? "Saytingizni yangilang, previewni tekshiring va qayta publish qiling."
                : "Template tanlang, ma'lumot kiriting va tayyor sahifani internetga qo'ying."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              href={publicUrl}
              onClick={(event) => event.preventDefault()}
            >
              {publicUrl}
            </a>
            <button
              className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
              onClick={resetDraft}
              type="button"
            >
              Reset
            </button>
            <button
              className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
              disabled={!canCreate}
              onClick={createSite}
              title={publishHint}
              type="button"
            >
              {publishStatus === "creating"
                ? "Saqlanyapti..."
                : editingSite
                  ? "Yangilash"
                  : "Sayt yaratish"}
            </button>
          </div>
          </div>
        </header>
        {publishStatus === "error" ? (
          <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {canCreate
              ? "Backendga yaratilmadi. API server ishlayotganini tekshirish kerak."
              : publishHint}
          </div>
        ) : null}
        {!canCreate && validationIssues.length > 0 ? (
          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
            <p>Sayt yaratish uchun quyidagilarni to&apos;g&apos;rilang:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {canCreate && validationWarnings.length > 0 ? (
          <div className="mt-4 rounded-md bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-100">
            <ul className="list-disc space-y-1 pl-5 font-medium">
              {validationWarnings.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <nav className="mt-5 grid gap-3 rounded-xl bg-white/82 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur md:grid-cols-3">
          {steps.map((item) => (
            <button
              className={
                item.id === step
                  ? "rounded-lg bg-slate-950 px-4 py-3 text-left text-white"
                  : "rounded-lg bg-slate-50 px-4 py-3 text-left text-slate-700 ring-1 ring-black/5"
              }
              key={item.id}
              onClick={() => setStep(item.id)}
              type="button"
            >
              <span className="text-xs font-semibold opacity-70">
                {String(item.id).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {item.label}
              </span>
              <span className="mt-1 block text-xs leading-5 opacity-70">
                {item.description}
              </span>
            </button>
          ))}
        </nav>

        <div
          className={
            step === 3
              ? "mt-6 grid gap-5 xl:grid-cols-[1fr_320px]"
              : "mt-6 grid gap-5 xl:grid-cols-[420px_1fr_300px]"
          }
        >
          {step !== 3 ? (
            <section className="flex min-w-0 flex-col gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Qadam {currentStep.id}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {currentStep.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {currentStep.description}
                </p>
              </div>
              {step === 1 ? (
                <>
            <Panel title="Paket">
              <div className="grid gap-2">
                {plans.map((plan) => (
                  <button
                    className={
                      draft.plan === plan
                        ? "rounded-md bg-slate-950 px-4 py-3 text-left text-white"
                        : "rounded-md bg-slate-50 px-4 py-3 text-left text-slate-800 ring-1 ring-black/6"
                    }
                    key={plan}
                    onClick={() => selectPlan(plan)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold capitalize">
                        {plan}
                      </span>
                      <span className="text-xs opacity-70">
                        {guestPlanDetails[plan].badge}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs leading-5 opacity-70">
                      {guestPlanDetails[plan].description}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Tanlangan paket">
              <div className="grid gap-3 text-sm">
                <StatusRow label="Plan" value={draft.plan.toUpperCase()} />
                <StatusRow
                  label="Imkoniyat"
                  value={guestPlanDetails[draft.plan].description}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="min-h-11 flex-1 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Ma&apos;lumot kiritish
                </button>
              </div>
            </Panel>
                </>
              ) : null}

              {step === 2 ? (
                <>
            <Panel title="Asosiy ma'lumot">
              <TextInput
                label="Biznes nomi"
                onChange={(value) => updateField("businessName", value)}
                status={
                  draft.businessName.trim().length === 0
                    ? "Majburiy"
                    : undefined
                }
                value={draft.businessName}
              />
              <TextInput
                label="Subdomain"
                onChange={(value) => {
                  if (!isEditing) {
                    updateField("slug", normalizeSlug(value));
                  }
                }}
                prefix="qr.dirac.space/"
                status={
                  isEditing
                    ? "Published link tahrirda o'zgarmaydi"
                    : normalizedSlug.length > 0 && normalizedSlug.length < 3
                    ? "Kamida 3 ta belgi"
                    : slugStatus === "checking"
                    ? "Tekshirilyapti"
                    : slugStatus === "taken"
                      ? "Band, boshqa nom tanlang"
                      : slugStatus === "unknown"
                        ? "Tekshiruv ishlamadi, internet yoki backendni tekshiring"
                      : slugStatus === "available"
                        ? "Bo'sh"
                        : undefined
                }
                value={draft.slug}
              />
              <TextInput
                label="Egasi telefon yoki email"
                onChange={(value) => {
                  setOwnerContact(value);
                  saveGuestOwnerContact(value);
                }}
                status="Dashboardni boshqa qurilmada tiklash uchun"
                value={ownerContact}
              />
              <TextInput
                label="Kategoriya"
                onChange={(value) => updateField("category", value)}
                value={draft.category}
              />
              <TextArea
                label="Qisqa tavsif"
                onChange={(value) => updateField("description", value)}
                value={draft.description}
              />
              {draft.plan !== "oddiy" ? (
                <>
                  <TextInput
                    label="Hero rasm URL"
                    onChange={(value) => updateField("coverUrl", value)}
                    value={draft.coverUrl}
                  />
                  <FileInput
                    label={
                      uploadingField === "cover"
                        ? "Yuklanyapti..."
                        : "Hero rasm yuklash"
                    }
                    onChange={uploadCover}
                  />
                </>
              ) : null}
            </Panel>

            <Panel title="Aloqa va ijtimoiy tarmoqlar">
              <TextInput
                label="Telefon"
                onChange={(value) => updateField("phone", value)}
                value={draft.phone}
              />
              <TextInput
                label="Telegram"
                onChange={(value) => updateField("telegram", value)}
                value={draft.telegram}
              />
              <TextInput
                label="Instagram"
                onChange={(value) => updateField("instagram", value)}
                value={draft.instagram}
              />
              <TextInput
                label="WhatsApp"
                onChange={(value) => updateField("whatsapp", value)}
                value={draft.whatsapp}
              />
              <TextInput
                label="Website"
                onChange={(value) => updateField("website", value)}
                value={draft.website}
              />
            </Panel>

            <Panel title="Ko'rinish">
              <ColorInput
                label="Asosiy rang"
                onChange={(value) => updateField("primaryColor", value)}
                value={draft.primaryColor}
              />
              <ColorInput
                label="Accent rang"
                onChange={(value) => updateField("accentColor", value)}
                value={draft.accentColor}
              />
              <TextArea
                label="Manzil"
                onChange={(value) => updateField("address", value)}
                value={draft.address}
              />
            </Panel>

            <Panel title="Xizmatlar">
              {draft.services.map((service, index) => (
                <div
                  className="rounded-md border border-slate-200 p-3"
                  key={service.id}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Xizmat {index + 1}
                    </p>
                    <button
                      className="text-sm font-semibold text-rose-600 disabled:text-slate-300"
                      disabled={draft.services.length <= 1}
                      onClick={() => removeService(service.id)}
                      type="button"
                    >
                      O&apos;chirish
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <TextInput
                      label="Nomi"
                      onChange={(value) =>
                        updateService(service.id, "name", value)
                      }
                      value={service.name}
                    />
                    <TextInput
                      label="Narx"
                      onChange={(value) =>
                        updateService(service.id, "price", value)
                      }
                      value={service.price}
                    />
                    <TextArea
                      label="Tavsif"
                      onChange={(value) =>
                        updateService(service.id, "description", value)
                      }
                      value={service.description}
                    />
                  </div>
                </div>
              ))}
              <SmallButton label="Xizmat qo'shish" onClick={addService} />
            </Panel>

            {draft.plan !== "oddiy" ? (
              <Panel title="Portfolio rasmlari">
                {draft.galleryImages.map((image, index) => (
                  <div
                    className="rounded-md border border-slate-200 p-3"
                    key={image.id}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">
                        Rasm {index + 1}
                      </p>
                      <button
                        className="text-sm font-semibold text-rose-600 disabled:text-slate-300"
                        disabled={draft.galleryImages.length <= 1}
                        onClick={() => removeGalleryImage(image.id)}
                        type="button"
                      >
                        O&apos;chirish
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <TextInput
                        label="Image URL"
                        onChange={(value) =>
                          updateGalleryImage(image.id, "url", value)
                        }
                        value={image.url}
                      />
                      <FileInput
                        label={
                          uploadingField === image.id
                            ? "Yuklanyapti..."
                            : "Rasm yuklash"
                        }
                        onChange={(file) => uploadGalleryImage(image.id, file)}
                      />
                      <TextInput
                        label="Alt text"
                        onChange={(value) =>
                          updateGalleryImage(image.id, "alt", value)
                        }
                        value={image.alt}
                      />
                    </div>
                  </div>
                ))}
                <SmallButton label="Rasm qo'shish" onClick={addGalleryImage} />
              </Panel>
            ) : null}

            {draft.plan !== "oddiy" ? (
              <Panel title="Mijozlar fikri">
                {draft.testimonials.map((review, index) => (
                  <div
                    className="rounded-md border border-slate-200 p-3"
                    key={review.id}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">
                        Fikr {index + 1}
                      </p>
                      <button
                        className="text-sm font-semibold text-rose-600 disabled:text-slate-300"
                        disabled={draft.testimonials.length <= 1}
                        onClick={() => removeTestimonial(review.id)}
                        type="button"
                      >
                        O&apos;chirish
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <TextInput
                        label="Ism"
                        onChange={(value) =>
                          updateTestimonial(review.id, "name", value)
                        }
                        value={review.name}
                      />
                      <TextArea
                        label="Fikr"
                        onChange={(value) =>
                          updateTestimonial(review.id, "text", value)
                        }
                        value={review.text}
                      />
                    </div>
                  </div>
                ))}
                <SmallButton label="Fikr qo'shish" onClick={addTestimonial} />
              </Panel>
            ) : null}
                </>
              ) : null}
          </section>
          ) : null}

          <section className="min-w-0">
            <div className="sticky top-5 rounded-xl bg-slate-900 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Live preview</p>
                  <p className="break-all text-xs text-slate-400">{publicUrl}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {draft.plan}
                </span>
              </div>
              <div className="h-[760px] overflow-auto rounded-lg bg-white">
                <PublicSiteRenderer site={site} />
              </div>
            </div>
          </section>

          <aside className="min-w-0">
            <div className="sticky top-5 grid gap-4">
              <Panel title="QR preview">
                <QrCode className="mx-auto max-w-56" label={publicUrl} value={publicUrl} />
              </Panel>

              <Panel title="Holat">
                <div className="grid gap-3 text-sm">
                  <StatusRow label="Plan" value={draft.plan.toUpperCase()} />
                  <StatusRow label="Link" value={`/${normalizedSlug || "guest"}`} />
                  <StatusRow
                    label="Kontakt"
                    value={hasAnyContact ? "Kiritilgan" : "Kiritilmagan"}
                  />
                  <StatusRow label="Xizmatlar" value={`${filledServicesCount} ta`} />
                  {draft.plan !== "oddiy" ? (
                    <>
                      <StatusRow label="Portfolio" value={`${filledGalleryCount} ta`} />
                      <StatusRow label="Fikrlar" value={`${filledTestimonialsCount} ta`} />
                    </>
                  ) : null}
                  <StatusRow label="Publish" value={publishHint} />
                  <StatusRow label="Saqlash" value={savedAt ?? "Draft"} />
                </div>
              </Panel>

              <Panel title="Boshqaruv">
                <div className="grid gap-2">
                  <button
                    className="min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10 disabled:text-slate-300"
                    disabled={step === 1}
                    onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                    type="button"
                  >
                    Orqaga
                  </button>
                  {step < 3 ? (
                    <button
                      className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
                      onClick={() => setStep((current) => (current === 1 ? 2 : 3))}
                      type="button"
                    >
                      Keyingi qadam
                    </button>
                  ) : (
                    <button
                      className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
                      disabled={!canCreate}
                      onClick={createSite}
                      title={publishHint}
                      type="button"
                    >
                      {publishStatus === "creating"
                        ? "Saqlanyapti..."
                        : editingSite
                          ? "O'zgarishlarni saqlash"
                        : "Internetga qo'yish"}
                    </button>
                  )}
                </div>
              </Panel>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function readCreatedSites() {
  try {
    const raw = window.localStorage.getItem(createdSitesStorageKey);
    return raw ? (JSON.parse(raw) as PublishedSite[]) : [];
  } catch {
    return [];
  }
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  onChange,
  prefix,
  status,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  prefix?: string;
  status?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="flex min-h-11 items-center overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-slate-500">
        {prefix ? (
          <span className="flex h-full items-center bg-slate-50 px-3 text-sm text-slate-400">
            {prefix}
          </span>
        ) : null}
        <input
          className="min-h-11 min-w-0 flex-1 px-3 text-sm outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </span>
      {status ? <span className="text-xs text-slate-500">{status}</span> : null}
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <textarea
        className="min-h-28 rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function FileInput({
  label,
  onChange,
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        accept="image/*"
        className="min-h-11 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
    </label>
  );
}

function ColorInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{value}</span>
        <input
          className="size-9 rounded border-0 bg-transparent"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
      </span>
    </label>
  );
}

function SmallButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-10 rounded-md bg-slate-100 px-3 text-sm font-semibold text-slate-800 ring-1 ring-black/5"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold">{value}</span>
    </div>
  );
}
