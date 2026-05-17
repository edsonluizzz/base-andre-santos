"use client";

import { useEffect, useState } from "react";
import { Instagram, ExternalLink, TrendingUp, Eye, Heart } from "lucide-react";
import Link from "next/link";

type Post = {
  postId: string;
  url: string;
  content: string;
  imageUrl: string;
  likes: number;
  comments: number;
  reach: number;
  engagement: number;
  publishedAt: { dateTime: string };
};

type MetricoolData = {
  posts: Post[];
  reels: Post[];
  avgReach: number;
  avgEngagement: number;
};

export function InstagramPanel() {
  const [data, setData] = useState<MetricoolData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/metricool/instagram?days=30")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        setData(d);
      })
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] animate-pulse">
        <div className="h-4 w-40 bg-white/[0.06] rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-white/[0.06] rounded-xl" />)}
        </div>
      </div>
    );
  }

  const topPosts = [...data.posts, ...data.reels]
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 3);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-5">
        <Instagram className="w-4 h-4 text-pink-400" />
        <h2 className="text-sm font-semibold text-foreground">Instagram</h2>
        <span className="text-[10px] text-muted-foreground">últimos 30 dias</span>
        <Link
          href="/instagram"
          className="ml-auto text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1"
        >
          Ver tudo <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-pink-400">{data.posts.length + data.reels.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Publicações</p>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-blue-400">
            {data.avgReach >= 1000
              ? `${(data.avgReach / 1000).toFixed(1)}k`
              : Math.round(data.avgReach)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Alcance médio</p>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-green-400">{data.avgEngagement.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Engajamento</p>
        </div>
      </div>

      {/* Top posts thumbnails */}
      {topPosts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {topPosts.map((p) => (
            <a
              key={p.postId ?? (p as { reelId?: string }).reelId}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-xl overflow-hidden group border border-white/[0.06]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={p.content?.slice(0, 40) ?? "Post"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1 text-white text-xs">
                  <Eye className="w-3 h-3" />
                  {p.reach >= 1000 ? `${(p.reach / 1000).toFixed(1)}k` : p.reach}
                </div>
                <div className="flex items-center gap-1 text-white text-xs">
                  <Heart className="w-3 h-3" />
                  {p.likes}
                </div>
                <div className="flex items-center gap-1 text-white text-xs">
                  <TrendingUp className="w-3 h-3" />
                  {p.engagement.toFixed(1)}%
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
