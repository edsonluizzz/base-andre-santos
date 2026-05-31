import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEbook, EBOOK_SLUGS } from "@/lib/ebooks";
import { EbookForm } from "./ebook-form";

export const dynamicParams = false;

export async function generateStaticParams() {
  return EBOOK_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ebook = getEbook(params.slug);
  if (!ebook) return { title: "Ebook não encontrado" };
  return {
    title: ebook.metaTitle,
    description: ebook.metaDescription,
    openGraph: {
      title: ebook.metaTitle,
      description: ebook.metaDescription,
      locale: "pt_BR",
    },
    twitter: {
      card: "summary",
      title: ebook.metaTitle,
      description: ebook.metaDescription,
    },
  };
}

export default function EbookLandingPage({ params }: { params: { slug: string } }) {
  const ebook = getEbook(params.slug);
  if (!ebook) notFound();
  return (
    <Suspense fallback={null}>
      <EbookForm ebook={ebook} />
    </Suspense>
  );
}
