"use client";

import { useEffect, useState } from "react";
import {
  Camera, Eye, Heart, MessageCircle, Share2, TrendingUp,
  ExternalLink, BookMarked, Film,
} from "lucide-react";

type Post = {
  postId?: string;
  reelId?: string;
  storyId?: string;
  url: string;
  content?: string;
  imageUrl: string;
  likes?: number;
  comments?: number;
  replies?: number;
  shares?: number;
  reach: number;
  engagement?: number;
  impressionsTotal?: number;
  saved?: number;
  views?: number;
  exits?: number;
  type: string;
  publishedAt: { dateTime: string; timezone: string };
};

type Data = {
  posts: Post[];
  reels: Post[];
  stories: Post[];
  avgReach: number;
  avgEngagement: number;
  instagramCadastros: number;
};

const DAYS_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function PostCard({ p }: { p: Post }) {
  const id = p.postId ?? p.reelId ?? p.storyId ?? p.url;
  const isReel = p.type?.includes("REEL");
  const isStory = p.type?.includes("STORY");
  const engagement = p.engagement ?? 0;
  const likes = p.likes ?? 0;
  const comments = p.comments ?? p.replies ?? 0;
  const shares = p.shares ?? 0;

  return (
    <div className="glass-card rounded-xl border border-white/[0.08] overflow-hidden flex flex-col">
      <a href={p.url} target="_blank" rel="noopener noreferrer" className="relative aspect-square block group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={id}
          src={p.imageUrl}
          alt={p.content?.slice(0, 60) ?? "Post"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isReel && (
          <span className="absolute top-2 left-2 bg-black/70 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Film className="w-3 h-3 text-pink-400" />
            <span className="text-[10px] text-white">Reel</span>
          </span>
        )}
        {isStory && (
          <span className="absolute top-2 left-2 bg-black/70 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Camera className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-white">Story</span>
          </span>
        )}
        <span className="absolute top-2 right-2 bg-black/70 rounded-md px-1.5 py-0.5 text-[10px] text-white">
          {fmtDate(p.publishedAt.dateTime)}
        </span>
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-white" />
        </div>
      </a>

      <div className="p-3 flex-1 flex flex-col gap-2">
        {p.content && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{p.content}</p>
        )}
        <div className="grid grid-cols-2 gap-1.5 mt-auto">
          {[
            { icon: Eye,           label: "Alcance",  value: fmtNum(p.reach),              color: "text-blue-400"   },
            { icon: TrendingUp,    label: "Engaj.",   value: `${engagement.toFixed(1)}%`,   color: "text-green-400"  },
            { icon: Heart,         label: "Curtidas", value: fmtNum(likes),                 color: "text-pink-400"   },
            { icon: MessageCircle, label: isStory ? "Respostas" : "Comentários", value: fmtNum(comments), color: "text-purple-400" },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <m.icon className={`w-3 h-3 ${m.color} shrink-0`} />
              <span className="text-[10px] text-muted-foreground">{m.label}:</span>
              <span className={`text-[10px] font-medium ${m.color}`}>{m.value}</span>
            </div>
          ))}
          {(p.saved ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <BookMarked className="w-3 h-3 text-yellow-400 shrink-0" />
              <span className="text-[10px] text-muted-foreground">Salvos:</span>
              <span className="text-[10px] font-medium text-yellow-400">{fmtNum(p.saved!)}</span>
            </div>
          )}
          {shares > 0 && (
            <div className="flex items-center gap-1.5">
              <Share2 className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="text-[10px] text-muted-foreground">Compart.:</span>
              <span className="text-[10px] font-medium text-orange-400">{fmtNum(shares)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstagramPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "reels" | "stories">("posts");

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/metricool/instagram?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const sorted = (list: Post[]) =>
    [...list].sort((a, b) => b.reach - a.reach);

  const totalPublicacoes = (data?.posts.length ?? 0) + (data?.reels.length ?? 0);

  const tabList: { key: "posts" | "reels" | "stories"; label: string; count: number }[] = [
    { key: "posts",   label: "Posts",   count: data?.posts.length ?? 0 },
    { key: "reels",   label: "Reels",   count: data?.reels.length ?? 0 },
    { key: "stories", label: "Stories", count: data?.stories.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Instagram</h1>
            <a
              href="https://www.instagram.com/andresantos_as"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
            >
              @andresantos_as <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.08]">
          {DAYS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === o.value
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Publicações",    value: loading ? "—" : String(totalPublicacoes),           color: "text-pink-400"   },
          { label: "Posts",          value: loading ? "—" : String(data?.posts.length ?? 0),    color: "text-purple-400" },
          { label: "Reels",          value: loading ? "—" : String(data?.reels.length ?? 0),    color: "text-orange-400" },
          { label: "Stories",        value: loading ? "—" : String(data?.stories.length ?? 0),  color: "text-yellow-400" },
          { label: "Alcance médio",  value: loading ? "—" : fmtNum(data?.avgReach ?? 0),        color: "text-blue-400"   },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-2xl p-5 border border-white/[0.08]">
            <p className="text-xs text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Engajamento médio */}
      {!loading && data && (
        <div className="glass-card rounded-2xl p-5 border border-green-500/20 bg-green-500/[0.04] flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-green-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-green-400">{data.avgEngagement.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Engajamento médio · últimos {days} dias</p>
          </div>
          <div className="ml-auto text-xs text-muted-foreground text-right hidden sm:block">
            <p>3% = bom</p>
            <p>6% = excelente</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08]">
        {tabList.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t.key
                ? "border-pink-400 text-pink-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}{" "}
            {!loading && data && (
              <span className="text-[10px] opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.08] overflow-hidden animate-pulse">
              <div className="aspect-square bg-white/[0.06]" />
              <div className="p-3 space-y-2">
                <div className="h-2 bg-white/[0.06] rounded w-3/4" />
                <div className="h-2 bg-white/[0.06] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {sorted(tab === "posts" ? data.posts : tab === "reels" ? data.reels : data.stories).length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhum {tab === "stories" ? "story" : tab === "posts" ? "post" : "reel"} encontrado no período selecionado.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted(tab === "posts" ? data.posts : tab === "reels" ? data.reels : data.stories).map((p) => (
                <PostCard key={p.postId ?? p.reelId ?? p.storyId ?? p.url} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
