import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sanitizeStaticHtml } from "@/lib/sanitize-html";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.staticPage.findUnique({ where: { slug } });
  if (!page) return {};
  return { title: page.title };
}

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.staticPage.findUnique({ where: { slug } });
  if (!page) notFound();

  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-slate-900">{page.title}</h1>
      <p className="mt-1 text-xs text-slate-400">Last updated {page.updatedAt.toLocaleDateString()}</p>
      <div className="static-content mt-8" dangerouslySetInnerHTML={{ __html: sanitizeStaticHtml(page.body) }} />
    </div>
  );
}
