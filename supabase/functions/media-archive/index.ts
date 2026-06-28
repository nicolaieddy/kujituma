import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ archived_url: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Wayback Save Page Now anonymous endpoint
    const target = `https://web.archive.org/save/${url}`;
    let archived_url: string | null = null;
    try {
      const resp = await fetch(target, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000) });
      const loc = resp.headers.get('content-location') ?? resp.headers.get('location');
      if (loc) archived_url = loc.startsWith('http') ? loc : `https://web.archive.org${loc}`;
      else archived_url = `https://web.archive.org/web/*/${url}`;
    } catch {
      archived_url = `https://web.archive.org/web/*/${url}`;
    }
    return new Response(JSON.stringify({ archived_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ archived_url: null, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
