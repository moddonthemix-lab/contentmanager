// The seven content tools. Each one declares the form fields the UI renders
// and builds the task prompt sent to Claude. Research instructions shared by
// every tool live in the system prompt (see prompts.js).

const PLATFORM_OPTIONS = ["TikTok", "Instagram", "YouTube Shorts", "YouTube", "Facebook", "LinkedIn", "X", "Pinterest", "Threads"];

export const TOOLS = [
  {
    id: "calendar",
    number: 1,
    name: "Content Calendar",
    tagline: "A 30-day plan mixing videos, carousels and captions.",
    fields: [
      { id: "niche", label: "Niche", type: "text", fromProfile: "niche", required: true, placeholder: "e.g. home fitness for busy moms" },
      { id: "platforms", label: "Platforms", type: "multi", options: PLATFORM_OPTIONS, fromProfile: "platforms", required: true },
      { id: "startDate", label: "Start date", type: "date", default: "today" },
      { id: "postsPerWeek", label: "Posts per week", type: "number", default: 5, min: 1, max: 21 },
      { id: "focus", label: "Goals or launches to plan around (optional)", type: "textarea", placeholder: "e.g. launching a coaching program on the 15th, want more saves and DMs" },
    ],
    build: (v) => `Create a 30-day social media content calendar for the niche "${v.niche}" on ${list(v.platforms)}, starting ${v.startDate || "today"}, at about ${v.postsPerWeek || 5} posts per week. Mix short-form videos, carousels and caption-led/static posts.
${v.focus ? `\nGoals and dates to plan around: ${v.focus}\n` : ""}
Research first: what is trending in this niche right now, upcoming holidays, awareness days, seasonal moments and cultural events inside these 30 days, and which formats each platform is currently rewarding.

Deliver:
1. A "Strategy for this month" section: 3-5 content pillars with the share of posts each gets, and the reasoning tied to your research.
2. The calendar as a markdown table with columns: Day | Date | Platform | Format | Pillar | Topic / angle | Hook (first line or first 2 seconds) | CTA. One row per post.
3. "Key dates this month" — the timely moments you built in, with the date and why each matters to this audience.
4. "Batch-production plan" — how to film/design the month in 2-3 sessions (which posts share a setup).`,
  },
  {
    id: "hooks",
    number: 2,
    name: "Viral Hooks",
    tagline: "Scroll-stopping opening lines for TikTok and Instagram.",
    fields: [
      { id: "topic", label: "Topic", type: "text", required: true, placeholder: "e.g. why your sourdough is flat" },
      { id: "platforms", label: "Platforms", type: "multi", options: PLATFORM_OPTIONS, default: ["TikTok", "Instagram"], fromProfile: "platforms" },
      { id: "count", label: "How many hooks", type: "number", default: 20, min: 5, max: 50 },
    ],
    build: (v) => `Write ${v.count || 20} scroll-stopping, engaging hooks for ${list(v.platforms) || "TikTok and Instagram"} posts about "${v.topic}".

Research first: find hooks and opening patterns that are performing right now on these platforms for this topic or niche, the questions and frustrations people are actually posting about it (comments, Reddit, forums, search suggestions), and any current trend or format the topic can ride.

Deliver:
1. "What's working right now" — 3-5 short bullets on current hook patterns and audience pain points from your research, with sources.
2. The hooks, grouped by type (e.g. curiosity gap, contrarian, mistake/warning, result-first, POV/relatable, question, list). For each hook give: the spoken/on-screen line, a suggested on-screen text overlay if it differs, and a one-line note on why it stops the scroll.
3. "Top 3 to test first" — your picks with the reason, plus how to A/B them.

Keep every hook under ~12 words where possible and make them sound like a person, not an ad.`,
  },
  {
    id: "design",
    number: 3,
    name: "Designing Prompts",
    tagline: "Canva-ready graphic ideas with text overlays.",
    fields: [
      { id: "topic", label: "Topic", type: "text", required: true, placeholder: "e.g. 5 budgeting mistakes in your 20s" },
      { id: "format", label: "Format", type: "select", options: ["Carousel", "Single post", "Story", "Reel / TikTok cover", "YouTube thumbnail", "Pinterest pin"], default: "Carousel" },
      { id: "count", label: "How many designs", type: "number", default: 5, min: 1, max: 15 },
    ],
    build: (v) => `Generate ${v.count || 5} Canva-ready graphic ideas with text overlays for "${v.topic}" in the format: ${v.format || "Carousel"}.

Research first: current design trends for this format and platform (typography, color, layout styles getting engagement right now), and what top accounts in this niche are posting visually.

For each design deliver:
- Concept name and the goal (saves, shares, follows, clicks).
- Canvas size in pixels and the exact Canva template search terms to start from.
- Layout: slide-by-slide (for carousels) or zone-by-zone, with the exact overlay text for every slide/zone. Keep overlay text short and legible on a phone.
- Typography (font pairings available in Canva), color palette as hex codes, and imagery/element suggestions (Canva element search terms or photo descriptions).
- The caption opener to post it with.

End with a "Brand consistency" note: the shared fonts/colors/layout rules that keep these looking like one account.`,
  },
  {
    id: "scripts",
    number: 4,
    name: "Video Scripts",
    tagline: "Short, scroll-stopping scripts with shot directions.",
    fields: [
      { id: "topic", label: "Topic", type: "text", required: true, placeholder: "e.g. 3 meal-prep hacks that save an hour" },
      { id: "length", label: "Length", type: "select", options: ["15 seconds", "30 seconds", "45 seconds", "60 seconds", "90 seconds"], default: "30 seconds" },
      { id: "count", label: "How many scripts", type: "number", default: 3, min: 1, max: 10 },
      { id: "style", label: "Style", type: "select", options: ["Talking head", "Voiceover + B-roll", "Tutorial / how-to", "Storytime", "Skit / POV", "Green screen reaction", "Mix it up"], default: "Mix it up" },
    ],
    build: (v) => `Write ${v.count || 3} short, engaging, scroll-stopping ${v.length || "30 seconds"} scripts for videos about "${v.topic}". Style: ${v.style || "Mix it up"}.

Research first: current facts, stats or news on this topic (so the scripts are accurate and timely), video formats and trends performing right now for this niche, and whether there is trending audio or a meme format that fits (name it and say where it's trending; say so if you could not verify one).

For each script deliver a markdown table with columns: Time | Visual / shot | On-screen text | Spoken line. Then:
- Hook (0-2s) called out separately with one alternate hook.
- Audio suggestion.
- Retention notes: where the pattern interrupt or re-hook happens.
- CTA and the caption opener.

Write spoken lines at a natural talking pace (~2.5 words per second) so they actually fit the length.`,
  },
  {
    id: "captions",
    number: 5,
    name: "Captions + Hashtags",
    tagline: "Storytelling captions with a CTA and researched hashtags.",
    fields: [
      { id: "topic", label: "What's the post about?", type: "textarea", required: true, placeholder: "Describe the post, video or carousel" },
      { id: "niche", label: "Niche", type: "text", fromProfile: "niche", required: true },
      { id: "platform", label: "Platform", type: "select", options: PLATFORM_OPTIONS, fromProfile: "platforms", default: "Instagram" },
      { id: "count", label: "How many caption options", type: "number", default: 3, min: 1, max: 10 },
    ],
    build: (v) => `Write ${v.count || 3} caption options for a ${v.platform || "Instagram"} post in the "${v.niche}" niche. The post: ${v.topic}

Each caption mixes storytelling and a clear CTA. Add 5 to 7 high-quality, targeted, currently-active hashtags.

Research first: verify each hashtag is actively used right now for this niche on ${v.platform || "Instagram"} (look for recent posts and how competitive it is), check current caption-length and keyword/SEO practices on this platform (captions are searchable now — find what the platform currently indexes), and look for any timely angle.

For each option deliver: the caption (first line written as a hook that works before the "more" cut), the CTA, and the hashtags. Then a single "Hashtag research" table: Hashtag | Size (broad / mid / niche) | Why it fits | Evidence it's active (with source). Don't pad with generic tags like #fyp or #viral unless your research shows they help on this platform right now.`,
  },
  {
    id: "engagement",
    number: 6,
    name: "Engagement Boost",
    tagline: "Comment replies that sound authentic and on-brand.",
    fields: [
      { id: "niche", label: "Niche", type: "text", fromProfile: "niche", required: true },
      { id: "comments", label: "Paste real comments to reply to (optional, one per line)", type: "textarea", placeholder: "Leave blank to get replies for the most common comment types in your niche" },
      { id: "count", label: "How many replies", type: "number", default: 15, min: 5, max: 40 },
    ],
    build: (v) => `Draft ${v.count || 15} comment replies that feel authentic, witty and brand-aligned for the "${v.niche}" niche.
${v.comments?.trim() ? `\nReply to these real comments (one reply each, then fill the rest with replies to common comment types):\n${v.comments.trim()}\n` : "\nCover the comment types this niche actually gets.\n"}
Research first: what people commonly comment on posts in this niche right now (questions, objections, praise, trolling, inside jokes), and how standout creators in this space reply in a way that drives more conversation.

Deliver replies grouped by comment type (question, compliment, skeptic/objection, negative or troll, tag-a-friend, "link?" / buying intent, superfan). For each give the comment, the reply, and a short tag for its goal (start a thread, turn into content, move to DMs, defuse). Include 2-3 "reply with a video" ideas. Finish with 5 quick rules for staying on-brand in replies. No generic "Thanks so much!" replies.`,
  },
  {
    id: "schedule",
    number: 7,
    name: "Scheduling Time",
    tagline: "Best posting schedule, times and frequency for max reach.",
    fields: [
      { id: "platforms", label: "Platforms", type: "multi", options: PLATFORM_OPTIONS, fromProfile: "platforms", required: true },
      { id: "timezone", label: "Your time zone", type: "text", default: "auto" },
      { id: "audienceLocation", label: "Where most of your audience is", type: "text", fromProfile: "audienceLocation", placeholder: "e.g. US East Coast, UK, worldwide" },
      { id: "capacity", label: "Realistic posts per week you can make", type: "number", default: 5, min: 1, max: 50 },
    ],
    build: (v) => `Suggest the best posting schedule, times and frequency for maximum reach on ${list(v.platforms)}. My time zone is ${v.timezone}. My audience is mostly in ${v.audienceLocation || "the same region as me"}. I can realistically make ${v.capacity || 5} posts per week.

Research first: the most recent published studies and platform guidance on posting times and frequency for each platform (name the source and its date — prefer the last 12 months and say if data is older), plus anything the platforms have said recently about how often to post or how distribution works.

Deliver:
1. A weekly schedule table: Day | Platform | Time (in my time zone) | Format | Why this slot.
2. Frequency recommendation per platform that fits my capacity, with what to prioritise if I can't do it all.
3. "What the data says" — per-platform summary of the research with sources and dates, including where sources disagree.
4. A 2-week testing plan to find my own best times, and which metric to judge it on (and where to find it in each platform's analytics).`,
  },
];

export function getTool(id) {
  return TOOLS.find((t) => t.id === id);
}

// What the browser needs to render forms (no prompt builders).
export function publicTools() {
  return TOOLS.map(({ build, ...rest }) => rest);
}

function list(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v || "";
}
