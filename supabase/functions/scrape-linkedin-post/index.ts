import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ScrapeBody { url: string }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as ScrapeBody;
    const url = (body?.url ?? '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'summary'],
        onlyMainContent: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.error || `Firecrawl ${res.status}`, status: res.status }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Firecrawl v2 may wrap under `data`
    const doc: any = data?.data ?? data;
    const markdown: string = doc?.markdown ?? '';
    const summary: string = doc?.summary ?? '';
    const metaTitle: string = doc?.metadata?.title ?? '';

    // Derive a clean post title from markdown body (first non-trivial line)
    let title = '';
    if (markdown) {
      const lines = markdown
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) =>
          l.length > 0 &&
          !/^#/.test(l) &&
          !/^!\[/.test(l) &&
          !/^\[.+\]\(/.test(l) &&
          !/^\d+\s*(likes?|comments?|reposts?)/i.test(l) &&
          !/^(like|comment|repost|share|follow)$/i.test(l),
        );
      title = (lines[0] ?? '').slice(0, 140);
    }
    if (!title) title = (summary || metaTitle || '').slice(0, 140);

    return new Response(
      JSON.stringify({ title, body: markdown, summary, metadata: doc?.metadata ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
