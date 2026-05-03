"use client";

import { useRef, useCallback, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, BookOpen, Shield, Heart, Users, GraduationCap, Church, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearnResource {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tag: string;
  image: string;
}

const LEARN_RESOURCES: LearnResource[] = [
  {
    id: "handbook",
    title: "General Handbook",
    description: "Official policies and procedures for Church administration and leadership.",
    href: "https://www.churchofjesuschrist.org/study/manual/general-handbook",
    icon: BookOpen,
    tag: "Policy",
    image: "https://images.unsplash.com/photo-1544396821-4dd40b938ad3?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "callings",
    title: "Understanding Callings",
    description: "How callings work, sustaining, setting apart, and releasing members.",
    href: "https://www.churchofjesuschrist.org/study/manual/general-handbook/30-callings-in-the-church",
    icon: Heart,
    tag: "Callings",
    image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "ward-council",
    title: "Ward Council",
    description: "Purpose, participants, and best practices for effective ward councils.",
    href: "https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church",
    icon: Users,
    tag: "Meetings",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "ministering",
    title: "Ministering",
    description: "Caring for members as the Savior would — principles and practices.",
    href: "https://www.churchofjesuschrist.org/study/manual/general-handbook/21-ministering",
    icon: Shield,
    tag: "Service",
    image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "sacrament-meeting",
    title: "Sacrament Meeting",
    description: "Planning, conducting, and participating in sacrament meeting.",
    href: "https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng#p4",
    icon: Church,
    tag: "Worship",
    image: "https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "leadership-library",
    title: "Leadership Library",
    description: "Training resources, talks, and guides for Church leaders.",
    href: "https://www.churchofjesuschrist.org/learn",
    icon: GraduationCap,
    tag: "Training",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop",
  },
];

export function HomeLearnSection() {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const scroll = useCallback(
    (dir: "left" | "right") => {
      const el = railRef.current;
      if (!el) return;
      el.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
      setTimeout(updateEdges, 350);
    },
    [updateEdges]
  );

  return (
    <div className="relative group">
      {/* Left fade + arrow */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10",
          "bg-gradient-to-r from-[hsl(var(--app-island))] to-transparent",
          "transition-opacity duration-200",
          atStart ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll learn resources left"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-20",
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-[hsl(var(--cp-surface))] border border-[hsl(var(--cp-border))]",
          "shadow-sm text-muted-foreground hover:text-foreground",
          "transition-all duration-200",
          atStart ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Scrollable rail */}
      <div
        ref={railRef}
        onScroll={updateEdges}
        className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hidden px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {LEARN_RESOURCES.map((resource) => {
          const Icon = resource.icon;

          return (
            <Link
              key={resource.id}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative flex flex-col rounded-[10px] overflow-hidden shrink-0 w-[260px]",
                "border border-[hsl(var(--cp-border))] bg-[hsl(var(--cp-surface))]",
                "hover:shadow-sm hover:border-[hsl(var(--cp-border)/0.7)]",
                "transition-all duration-150"
              )}
            >
              {/* Faded Image Thumbnail */}
              <div className="relative h-28 w-full shrink-0 overflow-hidden">
                <Image
                  src={resource.image}
                  alt={resource.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 260px) 260px"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--cp-surface))/0.3] to-[hsl(var(--cp-surface))]" />
                
                {/* Overlay elements sitting on top of the image */}
                <div className="absolute top-3 right-3">
                  <ExternalLink className="h-3.5 w-3.5 text-white drop-shadow-md shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-1 left-4 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[hsl(var(--cp-surface))] shadow-sm border border-[hsl(var(--cp-border))]">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 flex flex-col p-4 pt-3 gap-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-foreground leading-snug mb-1">
                    {resource.title}
                  </p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                    {resource.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Right fade + arrow */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10",
          "bg-gradient-to-l from-[hsl(var(--app-island))] to-transparent",
          "transition-opacity duration-200",
          atEnd ? "opacity-0" : "opacity-100"
        )}
      />
      <button
        aria-label="Scroll learn resources right"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-20",
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-[hsl(var(--cp-surface))] border border-[hsl(var(--cp-border))]",
          "shadow-sm text-muted-foreground hover:text-foreground",
          "transition-all duration-200",
          atEnd ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
