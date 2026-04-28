"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import { updateSiteInBackend } from "@/modules/api/backend-client";
import type {
  ContactButtonsBlock,
  FaqBlock,
  GalleryBlock,
  HeroBlock,
  HighlightsBlock,
  LocationBlock,
  ProcessBlock,
  PromoBlock,
  PublishedSite,
  ServicesBlock,
  SiteBlock,
  TestimonialsBlock,
  WorkingHoursBlock,
} from "@/modules/sites/types";

type AdminSiteEditorProps = {
  initialSite: PublishedSite;
  slug: string;
};

export function AdminSiteEditor({ initialSite, slug }: AdminSiteEditorProps) {
  const storageKey = `bm-site-draft:${slug}`;
  const [site, setSite] = useState(initialSite);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(storageKey);

    if (!rawDraft) {
      return;
    }

    try {
      window.setTimeout(() => {
        setSite(JSON.parse(rawDraft) as PublishedSite);
      }, 0);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const hero = site.blocks.find((block) => block.type === "hero") as
    | HeroBlock
    | undefined;
  const contacts = site.blocks.find(
    (block) => block.type === "contact_buttons",
  ) as ContactButtonsBlock | undefined;
  const services = site.blocks.find((block) => block.type === "services") as
    | ServicesBlock
    | undefined;
  const gallery = site.blocks.find((block) => block.type === "gallery") as
    | GalleryBlock
    | undefined;
  const location = site.blocks.find((block) => block.type === "location") as
    | LocationBlock
    | undefined;
  const workingHours = site.blocks.find(
    (block) => block.type === "working_hours",
  ) as WorkingHoursBlock | undefined;
  const highlights = site.blocks.find((block) => block.type === "highlights") as
    | HighlightsBlock
    | undefined;
  const promo = site.blocks.find((block) => block.type === "promo") as
    | PromoBlock
    | undefined;
  const testimonials = site.blocks.find(
    (block) => block.type === "testimonials",
  ) as TestimonialsBlock | undefined;
  const process = site.blocks.find((block) => block.type === "process") as
    | ProcessBlock
    | undefined;
  const faq = site.blocks.find((block) => block.type === "faq") as
    | FaqBlock
    | undefined;

  const publicUrl = useMemo(() => `https://${slug}.bm.com`, [slug]);

  function updateSite(nextSite: PublishedSite) {
    setSite(nextSite);
    window.localStorage.setItem(storageKey, JSON.stringify(nextSite));
    setSavedAt(new Date().toLocaleTimeString("uz-UZ"));
    setSaveStatus("idle");
  }

  async function saveToBackend() {
    setSaveStatus("saving");
    const savedSite = await updateSiteInBackend(site);

    if (!savedSite) {
      setSaveStatus("error");
      return;
    }

    setSite(savedSite);
    window.localStorage.setItem(storageKey, JSON.stringify(savedSite));
    setSavedAt(new Date().toLocaleTimeString("uz-UZ"));
    setSaveStatus("saved");
  }

  function updateHero<K extends keyof HeroBlock["data"]>(
    key: K,
    value: HeroBlock["data"][K],
  ) {
    updateSite({
      ...site,
      title: key === "businessName" ? String(value) : site.title,
      blocks: site.blocks.map((block) =>
        block.type === "hero"
          ? { ...block, data: { ...block.data, [key]: value } }
          : block,
      ),
    });
  }

  function updateContact<K extends keyof ContactButtonsBlock["data"]>(
    key: K,
    value: ContactButtonsBlock["data"][K],
  ) {
    updateSite({
      ...site,
      blocks: site.blocks.map((block) =>
        block.type === "contact_buttons"
          ? { ...block, data: { ...block.data, [key]: value } }
          : block,
      ),
    });
  }

  function updateTheme(key: keyof PublishedSite["theme"], value: string) {
    updateSite({
      ...site,
      theme: {
        ...site.theme,
        [key]: value,
      },
    });
  }

  function updateBlockData<TBlock extends SiteBlock>(
    blockId: string,
    data: TBlock["data"],
  ) {
    updateSite({
      ...site,
      blocks: site.blocks.map((block): SiteBlock =>
        block.id === blockId ? ({ ...block, data } as SiteBlock) : block,
      ),
    });
  }

  function toggleBlock(blockId: string, enabled: boolean) {
    updateSite({
      ...site,
      blocks: site.blocks.map((block) =>
        block.id === blockId ? { ...block, enabled } : block,
      ),
    });
  }

  function resetDraft() {
    window.localStorage.removeItem(storageKey);
    setSite(initialSite);
    setSavedAt(null);
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="flex min-w-0 flex-col gap-4">
        <EditorPanel title="Asosiy ma'lumotlar">
          <TextInput
            label="Biznes nomi"
            onChange={(value) => updateHero("businessName", value)}
            value={hero?.data.businessName ?? ""}
          />
          <TextInput
            label="Kategoriya"
            onChange={(value) => updateHero("category", value)}
            value={hero?.data.category ?? ""}
          />
          <TextArea
            label="Tavsif"
            onChange={(value) => updateHero("description", value)}
            value={hero?.data.description ?? ""}
          />
          <TextInput
            label="Cover image URL"
            onChange={(value) => updateHero("coverUrl", value)}
            value={hero?.data.coverUrl ?? ""}
          />
        </EditorPanel>

        <EditorPanel title="Aloqa">
          <TextInput
            label="Telefon"
            onChange={(value) => updateContact("phone", value)}
            value={contacts?.data.phone ?? ""}
          />
          <TextInput
            label="Telegram"
            onChange={(value) => updateContact("telegram", value)}
            value={contacts?.data.telegram ?? ""}
          />
          <TextInput
            label="Instagram"
            onChange={(value) => updateContact("instagram", value)}
            value={contacts?.data.instagram ?? ""}
          />
          <TextInput
            label="WhatsApp"
            onChange={(value) => updateContact("whatsapp", value)}
            value={contacts?.data.whatsapp ?? ""}
          />
        </EditorPanel>

        <EditorPanel title="Ranglar">
          <ColorInput
            label="Asosiy rang"
            onChange={(value) => updateTheme("primaryColor", value)}
            value={site.theme.primaryColor}
          />
          <ColorInput
            label="Accent rang"
            onChange={(value) => updateTheme("accentColor", value)}
            value={site.theme.accentColor ?? site.theme.primaryColor}
          />
          <ColorInput
            label="Fon"
            onChange={(value) => updateTheme("backgroundColor", value)}
            value={site.theme.backgroundColor}
          />
        </EditorPanel>

        {highlights ? (
          <HighlightsEditor
            block={highlights}
            onChange={(data) => updateBlockData<HighlightsBlock>(highlights.id, data)}
            onToggle={(enabled) => toggleBlock(highlights.id, enabled)}
          />
        ) : null}

        {services ? (
          <ServicesEditor
            block={services}
            onChange={(data) => updateBlockData<ServicesBlock>(services.id, data)}
            onToggle={(enabled) => toggleBlock(services.id, enabled)}
          />
        ) : null}

        {promo ? (
          <PromoEditor
            block={promo}
            onChange={(data) => updateBlockData<PromoBlock>(promo.id, data)}
            onToggle={(enabled) => toggleBlock(promo.id, enabled)}
          />
        ) : null}

        {gallery ? (
          <GalleryEditor
            block={gallery}
            onChange={(data) => updateBlockData<GalleryBlock>(gallery.id, data)}
            onToggle={(enabled) => toggleBlock(gallery.id, enabled)}
          />
        ) : null}

        {process ? (
          <ProcessEditor
            block={process}
            onChange={(data) => updateBlockData<ProcessBlock>(process.id, data)}
            onToggle={(enabled) => toggleBlock(process.id, enabled)}
          />
        ) : null}

        {testimonials ? (
          <TestimonialsEditor
            block={testimonials}
            onChange={(data) =>
              updateBlockData<TestimonialsBlock>(testimonials.id, data)
            }
            onToggle={(enabled) => toggleBlock(testimonials.id, enabled)}
          />
        ) : null}

        {faq ? (
          <FaqEditor
            block={faq}
            onChange={(data) => updateBlockData<FaqBlock>(faq.id, data)}
            onToggle={(enabled) => toggleBlock(faq.id, enabled)}
          />
        ) : null}

        {workingHours ? (
          <WorkingHoursEditor
            block={workingHours}
            onChange={(data) =>
              updateBlockData<WorkingHoursBlock>(workingHours.id, data)
            }
            onToggle={(enabled) => toggleBlock(workingHours.id, enabled)}
          />
        ) : null}

        {location ? (
          <LocationEditor
            block={location}
            onChange={(data) => updateBlockData<LocationBlock>(location.id, data)}
            onToggle={(enabled) => toggleBlock(location.id, enabled)}
          />
        ) : null}

        <QrPanel publicUrl={publicUrl} slug={slug} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            disabled={saveStatus === "saving"}
            onClick={saveToBackend}
            type="button"
          >
            {saveStatus === "saving" ? "Saqlanyapti..." : "Backendga saqlash"}
          </button>
          <button
            className="min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
            onClick={resetDraft}
            type="button"
          >
            Reset
          </button>
          {savedAt ? (
            <span className="text-sm text-slate-500">Saqlangan: {savedAt}</span>
          ) : null}
          {saveStatus === "error" ? (
            <span className="text-sm font-semibold text-rose-600">
              Backendga saqlanmadi
            </span>
          ) : null}
          {saveStatus === "saved" ? (
            <span className="text-sm font-semibold text-emerald-700">
              Backendga yozildi
            </span>
          ) : null}
        </div>
      </section>

      <section className="min-w-0">
        <div className="sticky top-5 rounded-xl bg-slate-900 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Live preview</p>
              <p className="text-xs text-slate-400">{publicUrl}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {site.templateKey}
            </span>
          </div>
          <div className="h-[760px] overflow-auto rounded-lg bg-white">
            <PublicSiteRenderer site={site} />
          </div>
        </div>
      </section>
    </div>
  );
}

function EditorPanel({
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
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{value}</span>
        <input
          className="size-9 rounded border-0 bg-transparent"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
      </div>
    </label>
  );
}

function BlockHeader({
  checked,
  onToggle,
  title,
}: {
  checked: boolean;
  onToggle: (enabled: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <input
          checked={checked}
          className="size-4"
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        Ko&apos;rsatish
      </label>
    </div>
  );
}

function BlockEditorPanel({
  children,
  enabled,
  onToggle,
  title,
}: {
  children: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  title: string;
}) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
      <BlockHeader checked={enabled} onToggle={onToggle} title={title} />
      <div className={enabled ? "mt-4 grid gap-3" : "mt-4 hidden"}>
        {children}
      </div>
    </section>
  );
}

function ServicesEditor({
  block,
  onChange,
  onToggle,
}: {
  block: ServicesBlock;
  onChange: (data: ServicesBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel
      enabled={block.enabled}
      onToggle={onToggle}
      title="Xizmatlar"
    >
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.items.map((item, index) => (
        <div className="rounded-md border border-slate-200 p-3" key={item.id}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              Xizmat {index + 1}
            </p>
            <button
              className="text-sm font-semibold text-rose-600 disabled:text-slate-300"
              disabled={block.data.items.length <= 1}
              onClick={() =>
                onChange({
                  ...block.data,
                  items: block.data.items.filter((entry) => entry.id !== item.id),
                })
              }
              type="button"
            >
              O&apos;chirish
            </button>
          </div>
          <div className="grid gap-3">
            <TextInput
              label="Nomi"
              onChange={(name) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, name } : entry,
                  ),
                })
              }
              value={item.name}
            />
            <TextInput
              label="Narx"
              onChange={(price) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, price } : entry,
                  ),
                })
              }
              value={item.price ?? ""}
            />
            <TextArea
              label="Tavsif"
              onChange={(description) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, description } : entry,
                  ),
                })
              }
              value={item.description ?? ""}
            />
          </div>
        </div>
      ))}
      <SmallButton
        label="Xizmat qo'shish"
        onClick={() =>
          onChange({
            ...block.data,
            items: [
              ...block.data.items,
              {
                id: `service_${Date.now()}`,
                name: "Yangi xizmat",
                description: "Qisqa tavsif",
                price: "Kelishiladi",
              },
            ],
          })
        }
      />
    </BlockEditorPanel>
  );
}

function GalleryEditor({
  block,
  onChange,
  onToggle,
}: {
  block: GalleryBlock;
  onChange: (data: GalleryBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Gallery">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.images.map((image, index) => (
        <div className="rounded-md border border-slate-200 p-3" key={image.id}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              Rasm {index + 1}
            </p>
            <button
              className="text-sm font-semibold text-rose-600 disabled:text-slate-300"
              disabled={block.data.images.length <= 1}
              onClick={() =>
                onChange({
                  ...block.data,
                  images: block.data.images.filter((entry) => entry.id !== image.id),
                })
              }
              type="button"
            >
              O&apos;chirish
            </button>
          </div>
          <div className="grid gap-3">
            <TextInput
              label="Image URL"
              onChange={(url) =>
                onChange({
                  ...block.data,
                  images: block.data.images.map((entry) =>
                    entry.id === image.id ? { ...entry, url } : entry,
                  ),
                })
              }
              value={image.url}
            />
            <TextInput
              label="Alt text"
              onChange={(alt) =>
                onChange({
                  ...block.data,
                  images: block.data.images.map((entry) =>
                    entry.id === image.id ? { ...entry, alt } : entry,
                  ),
                })
              }
              value={image.alt}
            />
          </div>
        </div>
      ))}
      <SmallButton
        label="Rasm qo'shish"
        onClick={() =>
          onChange({
            ...block.data,
            images: [
              ...block.data.images,
              {
                id: `image_${Date.now()}`,
                url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85",
                alt: "Portfolio image",
              },
            ],
          })
        }
      />
    </BlockEditorPanel>
  );
}

function LocationEditor({
  block,
  onChange,
  onToggle,
}: {
  block: LocationBlock;
  onChange: (data: LocationBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Manzil">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      <TextArea
        label="Manzil"
        onChange={(address) => onChange({ ...block.data, address })}
        value={block.data.address}
      />
      <TextInput
        label="Map URL"
        onChange={(mapUrl) => onChange({ ...block.data, mapUrl })}
        value={block.data.mapUrl ?? ""}
      />
    </BlockEditorPanel>
  );
}

function WorkingHoursEditor({
  block,
  onChange,
  onToggle,
}: {
  block: WorkingHoursBlock;
  onChange: (data: WorkingHoursBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Ish vaqti">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.rows.map((row, index) => (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={row.day + index}>
          <input
            className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none"
            onChange={(event) =>
              onChange({
                ...block.data,
                rows: block.data.rows.map((entry, rowIndex) =>
                  rowIndex === index ? { ...entry, day: event.target.value } : entry,
                ),
              })
            }
            value={row.day}
          />
          <input
            className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none"
            onChange={(event) =>
              onChange({
                ...block.data,
                rows: block.data.rows.map((entry, rowIndex) =>
                  rowIndex === index
                    ? { ...entry, value: event.target.value }
                    : entry,
                ),
              })
            }
            value={row.value}
          />
          <button
            className="rounded-md px-2 text-sm font-semibold text-rose-600 disabled:text-slate-300"
            disabled={block.data.rows.length <= 1}
            onClick={() =>
              onChange({
                ...block.data,
                rows: block.data.rows.filter((_, rowIndex) => rowIndex !== index),
              })
            }
            type="button"
          >
            X
          </button>
        </div>
      ))}
      <SmallButton
        label="Vaqt qo'shish"
        onClick={() =>
          onChange({
            ...block.data,
            rows: [...block.data.rows, { day: "Yangi kun", value: "09:00 - 18:00" }],
          })
        }
      />
    </BlockEditorPanel>
  );
}

function HighlightsEditor({
  block,
  onChange,
  onToggle,
}: {
  block: HighlightsBlock;
  onChange: (data: HighlightsBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Highlights">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.items.map((item) => (
        <div className="grid grid-cols-2 gap-2" key={item.id}>
          <input
            className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none"
            onChange={(event) =>
              onChange({
                ...block.data,
                items: block.data.items.map((entry) =>
                  entry.id === item.id ? { ...entry, value: event.target.value } : entry,
                ),
              })
            }
            value={item.value}
          />
          <input
            className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none"
            onChange={(event) =>
              onChange({
                ...block.data,
                items: block.data.items.map((entry) =>
                  entry.id === item.id ? { ...entry, label: event.target.value } : entry,
                ),
              })
            }
            value={item.label}
          />
        </div>
      ))}
    </BlockEditorPanel>
  );
}

function PromoEditor({
  block,
  onChange,
  onToggle,
}: {
  block: PromoBlock;
  onChange: (data: PromoBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Promo / Booking">
      <TextInput
        label="Sarlavha"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      <TextArea
        label="Tavsif"
        onChange={(description) => onChange({ ...block.data, description })}
        value={block.data.description}
      />
      <TextInput
        label="Tugma matni"
        onChange={(actionLabel) => onChange({ ...block.data, actionLabel })}
        value={block.data.actionLabel ?? ""}
      />
      <TextInput
        label="Tugma URL"
        onChange={(actionUrl) => onChange({ ...block.data, actionUrl })}
        value={block.data.actionUrl ?? ""}
      />
    </BlockEditorPanel>
  );
}

function ProcessEditor({
  block,
  onChange,
  onToggle,
}: {
  block: ProcessBlock;
  onChange: (data: ProcessBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Jarayon">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.items.map((item) => (
        <div className="rounded-md border border-slate-200 p-3" key={item.id}>
          <div className="grid gap-3">
            <TextInput
              label="Step"
              onChange={(step) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, step } : entry,
                  ),
                })
              }
              value={item.step}
            />
            <TextInput
              label="Nomi"
              onChange={(title) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, title } : entry,
                  ),
                })
              }
              value={item.title}
            />
            <TextArea
              label="Tavsif"
              onChange={(description) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, description } : entry,
                  ),
                })
              }
              value={item.description}
            />
          </div>
        </div>
      ))}
    </BlockEditorPanel>
  );
}

function TestimonialsEditor({
  block,
  onChange,
  onToggle,
}: {
  block: TestimonialsBlock;
  onChange: (data: TestimonialsBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="Fikrlar">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.items.map((item) => (
        <div className="rounded-md border border-slate-200 p-3" key={item.id}>
          <TextInput
            label="Ism"
            onChange={(name) =>
              onChange({
                ...block.data,
                items: block.data.items.map((entry) =>
                  entry.id === item.id ? { ...entry, name } : entry,
                ),
              })
            }
            value={item.name}
          />
          <div className="mt-3">
            <TextArea
              label="Fikr"
              onChange={(text) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, text } : entry,
                  ),
                })
              }
              value={item.text}
            />
          </div>
        </div>
      ))}
    </BlockEditorPanel>
  );
}

function FaqEditor({
  block,
  onChange,
  onToggle,
}: {
  block: FaqBlock;
  onChange: (data: FaqBlock["data"]) => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <BlockEditorPanel enabled={block.enabled} onToggle={onToggle} title="FAQ">
      <TextInput
        label="Section nomi"
        onChange={(title) => onChange({ ...block.data, title })}
        value={block.data.title}
      />
      {block.data.items.map((item) => (
        <div className="rounded-md border border-slate-200 p-3" key={item.id}>
          <TextInput
            label="Savol"
            onChange={(question) =>
              onChange({
                ...block.data,
                items: block.data.items.map((entry) =>
                  entry.id === item.id ? { ...entry, question } : entry,
                ),
              })
            }
            value={item.question}
          />
          <div className="mt-3">
            <TextArea
              label="Javob"
              onChange={(answer) =>
                onChange({
                  ...block.data,
                  items: block.data.items.map((entry) =>
                    entry.id === item.id ? { ...entry, answer } : entry,
                  ),
                })
              }
              value={item.answer}
            />
          </div>
        </div>
      ))}
    </BlockEditorPanel>
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

function QrPanel({ publicUrl, slug }: { publicUrl: string; slug: string }) {
  const pattern = useMemo(
    () =>
      Array.from({ length: 49 }, (_, index) => {
        const seed = slug.charCodeAt(index % slug.length) + index * 17;
        return seed % 3 !== 0;
      }),
    [slug],
  );

  return (
    <EditorPanel title="QR panel">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="mx-auto grid size-44 grid-cols-7 gap-1 rounded-md bg-white p-3 shadow-sm">
          {pattern.map((active, index) => (
            <span
              className={active ? "rounded-sm bg-slate-950" : "rounded-sm bg-white"}
              key={index}
            />
          ))}
        </div>
        <p className="mt-4 break-all text-center text-sm font-medium text-slate-700">
          {publicUrl}
        </p>
        <p className="mt-2 text-center text-xs leading-5 text-slate-500">
          Hozircha bu QR maket. Haqiqiy scannable QR uchun keyingi qadamda
          `qrcode` dependency qo&apos;shamiz.
        </p>
      </div>
    </EditorPanel>
  );
}
