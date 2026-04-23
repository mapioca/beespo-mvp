import { NextRequest, NextResponse } from "next/server"

const ALLOWED_HOST = "www.churchofjesuschrist.org"
const MAX_BYTES = 200_000
const FETCH_TIMEOUT_MS = 6_000

type LinkPreview = {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

function isAllowedChurchUrl(raw: string): URL | null {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  if (parsed.hostname !== ALLOWED_HOST) return null
  return parsed
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim()
}

function extractMeta(html: string, key: string): string | null {
  const keyPattern = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${keyPattern}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${keyPattern}["']`,
      "i"
    ),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeEntities(match[1])
  }
  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1] ? decodeEntities(match[1]) : null
}

async function fetchHead(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BeespoLinkPreview/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    })
    if (!response.ok || !response.body) {
      throw new Error(`Upstream returned ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let html = ""
    let bytes = 0
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      html += decoder.decode(value, { stream: true })
      if (/<\/head>/i.test(html)) break
    }
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
    return html
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  const parsed = isAllowedChurchUrl(rawUrl)
  if (!parsed) {
    return NextResponse.json(
      { error: `Only https://${ALLOWED_HOST} URLs are allowed` },
      { status: 400 }
    )
  }

  try {
    const html = await fetchHead(parsed.toString())
    const preview: LinkPreview = {
      url: parsed.toString(),
      title:
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        extractTitle(html),
      description:
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description") ??
        extractMeta(html, "description"),
      image:
        extractMeta(html, "og:image") ??
        extractMeta(html, "twitter:image"),
      siteName: extractMeta(html, "og:site_name"),
    }

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
