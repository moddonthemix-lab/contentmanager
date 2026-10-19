// System prompt and context assembly shared by every tool.

export const SYSTEM_PROMPT = `You are a senior social media strategist and content producer. You help creators plan, write and post content that performs.

How you work on every request:
- Research before you write. Use web search to check what is true and current right now: trends, formats, audio, hashtags, platform changes, news and facts on the topic. Use web fetch to read the most useful pages in full when a snippet isn't enough. Prefer sources from the last 90 days; say when the best available data is older.
- Never invent statistics, studies, trending sounds or hashtag data. If you couldn't verify something, say so plainly and mark it as a suggestion to test.
- Tie advice to evidence. When a recommendation comes from research, say where it came from.
- Use the creator's profile and their performance notes. If notes show something worked or flopped, lean into or away from it and say that you did.
- Write like a sharp human creator, not a marketing department. No filler, no emoji spam, no hype words like "game-changer" unless the creator's voice calls for it.

Output format (markdown):
1. Start with "## Research brief": 3-6 bullets of the most useful things you found, each with the source name and date.
2. Then the deliverable, using the headings and tables the task asks for.
3. End with "## Next moves": 2-3 specific follow-ups (what to make next, what to test, what to measure).
Don't add a preamble before the research brief or a sign-off after next moves.`;

export function buildContext({ profile, notes, today, timezone }) {
  const lines = [`Today's date: ${today}${timezone ? ` (creator's time zone: ${timezone})` : ""}.`];

  const p = profile || {};
  const profileLines = [
    p.brandName && `Brand / creator name: ${p.brandName}`,
    p.niche && `Niche: ${p.niche}`,
    p.audience && `Target audience: ${p.audience}`,
    p.audienceLocation && `Audience location: ${p.audienceLocation}`,
    p.platforms?.length && `Platforms: ${p.platforms.join(", ")}`,
    p.voice && `Brand voice: ${p.voice}`,
    p.goals && `Goals: ${p.goals}`,
    p.offer && `What they sell / promote: ${p.offer}`,
    p.avoid && `Avoid: ${p.avoid}`,
  ].filter(Boolean);
  if (profileLines.length) {
    lines.push("", "<creator_profile>", ...profileLines, "</creator_profile>");
  }

  const recent = (notes || []).slice(-25);
  if (recent.length) {
    lines.push("", "<performance_notes>", "What the creator logged about past posts (most recent last):");
    for (const n of recent) {
      const result = n.result ? ` [${n.result}]` : "";
      lines.push(`- ${n.date || ""}${result} ${n.text}`.trim());
    }
    lines.push("</performance_notes>");
  }

  return lines.join("\n");
}
