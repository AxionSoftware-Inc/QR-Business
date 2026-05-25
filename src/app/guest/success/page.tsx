import Link from "next/link";
import { notFound } from "next/navigation";
import { findPublishedSiteBySlugAsync } from "@/modules/sites/site-repository";
import { PrintButton } from "@/shared/ui/print-button";

type GuestSuccessPageProps = {
  searchParams: Promise<{
    slug?: string;
  }>;
};

export default async function GuestSuccessPage({
  searchParams,
}: GuestSuccessPageProps) {
  const { slug } = await searchParams;

  if (!slug) {
    notFound();
  }

  const site = await findPublishedSiteBySlugAsync(slug);

  if (!site) {
    notFound();
  }

  const publicPath = `/${slug}`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000"}${publicPath}`;
  const qrPngUrl = `/api/qr?url=${encodeURIComponent(publicUrl)}`;
  const qrSvgUrl = `${qrPngUrl}&format=svg`;
  const qrPdfUrl = `/api/qr-sheet?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(site.title)}`;
  const fileBase = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef7f4,#f7f8fb_38%,#eef1f6)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Publish tugadi
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            {site.title} tayyor.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Public link ishlaydi, QR scannable holatda. Endi linkni ulashing,
            QR kodni yuklab oling yoki dashboarddan tahrir qiling.
          </p>
          <div className="mt-6 rounded-lg bg-slate-50 p-4 ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">Public link</p>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Online
              </span>
            </div>
            <p className="mt-2 break-all text-lg font-semibold text-slate-950">
              {publicUrl}
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StepCard label="1" title="Linkni oching" text="Sahifa to'g'ri ko'rinishini tekshiring." />
            <StepCard label="2" title="QR yuklab oling" text="PNG sticker uchun, SVG bosmaxona uchun." />
            <StepCard label="3" title="Dashboard" text="Keyin kontentni oson yangilang." />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white"
              href={publicPath}
              target="_blank"
            >
              Sahifani ochish
            </Link>
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              href={`/guest/builder?edit=${slug}`}
            >
              Tahrirlash
            </Link>
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              href="/guest/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </section>

        <aside className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="mb-3 text-sm font-semibold text-slate-500">QR paket</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${site.title} QR`}
            className="aspect-square rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10"
            src={qrPngUrl}
          />
          <p className="mt-2 break-all text-center text-xs leading-5 text-slate-500">
            {publicUrl}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <a
              className="flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-3 font-semibold text-white"
              download={`${fileBase}.png`}
              href={qrPngUrl}
            >
              PNG
            </a>
            <a
              className="flex min-h-11 items-center justify-center rounded-md bg-white px-3 font-semibold text-slate-800 ring-1 ring-black/10"
              download={`${fileBase}.svg`}
              href={qrSvgUrl}
            >
              SVG
            </a>
            <PrintButton className="col-span-2 min-h-11 rounded-md bg-teal-700 px-3 font-semibold text-white" />
            <a
              className="col-span-2 flex min-h-11 items-center justify-center rounded-md bg-white px-3 font-semibold text-slate-800 ring-1 ring-black/10"
              download={`${fileBase}-stickers.pdf`}
              href={qrPdfUrl}
            >
              Sticker PDF
            </a>
          </div>
          <div className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Plan</span>
              <span className="font-semibold uppercase">{site.templateKey}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold">{site.status}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function StepCard({
  label,
  text,
  title,
}: {
  label: string;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5">
      <span className="flex size-8 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">
        {label}
      </span>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
