/**
 * Personality copy system for yclaude.
 * All quips follow a dry/deadpan, mock-exasperated, tired-but-affectionate register.
 * Voice rules: 1-2 sentences max. No exclamation marks. No emoji (unless extremely dry).
 * Think: Bill Bryson writing about your token bills.
 */

export const QUIPS = {
  /** Non-zero spend, any amount — mild observation that spending has begun */
  spend_any: [
    'Claude has been productive. Your wallet less so.',
    'Something was spent. The ledger is now non-zero.',
    'The meter has started. Claude does not feel guilty about this.',
    "Tokens exchanged, dollars vanished. That's the deal.",
    'A small amount left your account. Claude is already working on the next one.',
  ],

  /** $1+ crossed — deadpan acknowledgment of the first dollar */
  spend_1: [
    'One dollar down. Infinite refactors to go.',
    'Your first dollar. Claude spent it well, probably.',
    'A dollar. Not much to show for it, or possibly a great deal.',
    'One dollar in. The slope begins here.',
    "You've crossed the threshold. There is no uncrossing it.",
  ],

  /** $5+ total — casual, slightly resigned */
  spend_5: [
    "Five dollars. That's, like, a coffee. A small one.",
    "Five dollars gone. You've now spent more on Claude than on some apps you actually use.",
    "At five dollars, you're firmly in the habit zone.",
    "Five dollars. Claude would apologize, but it doesn't remember any of this.",
    'Five dollars and counting. Approximately one artisan pastry.',
  ],

  /** $10+ total — affectionate inevitability */
  spend_10: [
    'Ten dollars in. Claude is basically an employee now.',
    'Ten dollars. This is what commitment looks like, apparently.',
    "You've spent ten dollars. Claude has no opinion on this.",
    'Ten dollars. The kind of sum that rounds down on a balance sheet and rounds up in your memory.',
    "Ten dollars. Claude doesn't keep count, but you do, and here you are.",
  ],

  /** $50+ total — mild concern framed as advice */
  spend_50: [
    'Fifty dollars. Have you considered cheaper hobbies.',
    'Fifty dollars in. Claude remains available for comment.',
    'At fifty dollars, you might want to see what all this code actually does.',
    "Fifty dollars. That's a dinner. Or a lot of context windows. You chose context windows.",
    'Fifty dollars. The sort of number that prompts a brief, private reckoning.',
  ],

  /** $100+ total — quiet awe, no judgment */
  spend_100: [
    "A hundred dollars. Claude remembers nothing, but you'll remember this.",
    'One hundred dollars. Somewhere, a server is very slightly warmer.',
    'A hundred dollars. You have fully committed to the bit.',
    "One hundred dollars in. There's nothing left to say that hasn't already been tokenized.",
    'A hundred dollars. This is not a criticism. This is an observation.',
    'Triple digits. You are a patron of the computational arts.',
    "A hundred dollars. That's a nice dinner, or about forty thousand haikus.",
  ],

  /** $250+ total — impressed, slightly concerned */
  spend_250: [
    "Two hundred and fifty dollars. You are Claude's favorite customer. Statistically.",
    'A quarter grand on AI. Most people stop before this. You are not most people.',
    '$250. At this point Claude should be sending you a holiday card.',
    'Two-fifty. The sunk cost fallacy has nothing to do with this, probably.',
    "A quarter of a thousand dollars. It sounds worse that way, doesn't it.",
  ],

  /** $500+ total — deadpan respect */
  spend_500: [
    'Five hundred dollars. You could have bought a chair. You bought tokens instead.',
    'Half a grand. Claude does not offer loyalty discounts, but morally it should.',
    '$500. This is either a very productive codebase or a very expensive conversation.',
    'Five hundred dollars. Somewhere, a product manager is impressed.',
    'Half a thousand dollars on AI-assisted code. The future is expensive.',
  ],

  /** $1000+ total — quiet reverence */
  spend_1000: [
    'One thousand dollars. You are no longer experimenting. This is a lifestyle.',
    'A grand. Claude has been a full team member at this point, just without the benefits.',
    '$1,000. Most subscriptions are cheaper. Most subscriptions do less.',
    'One thousand dollars. The four-digit club has no perks, only awareness.',
    'A thousand dollars in. You and Claude have been through a lot together.',
    'Four digits. The sort of number that makes you close the tab and then open it again.',
  ],

  /** $2500+ total — almost affectionate awe */
  spend_2500: [
    'Two and a half thousand dollars. Claude would blush if it had capillaries.',
    "$2,500. You have spent a month's rent on code generation. No judgment, only respect.",
    'Twenty-five hundred dollars. At this scale, the tokens are basically colleagues.',
    '$2,500. This is dedication measured in API calls.',
  ],

  /** $5000+ total — speechless, single-sentence */
  spend_5000: [
    'Five thousand dollars. There is nothing dry enough to say about this.',
    '$5,000. Claude is not tracking this. You are. And here we are.',
    'Five grand. You are funding the future, one context window at a time.',
    '$5,000 on tokens. The ROI is either incredible or unknowable.',
  ],

  /** $10000+ total — the final tier */
  spend_10000: [
    'Five figures. You should probably frame this dashboard.',
    '$10,000+. At this point, Claude is less a tool and more a financial dependent.',
    'Ten thousand dollars. The sort of number that deserves a moment of silence.',
    'Five figures on AI. Somewhere, a GPU cluster nods in quiet appreciation.',
  ],

  /** Overview with zero data — patient observation */
  empty_overview: [
    'No activity yet. Claude is patiently waiting.',
    'Nothing recorded yet. Open a project and Claude will be watching.',
    'The overview is empty. This is the before.',
    'No data. No opinion. Start a session to change at least one of those things.',
    'Nothing here yet. Claude is available whenever you are.',
  ],

  /** Sessions page with no sessions matching current filter — deadpan observation of absence */
  empty_sessions: [
    'No sessions yet. Claude is off the clock. Enjoy the silence.',
    "No sessions found. Either you haven't started, or the filter is very specific.",
    'Empty. The absence of sessions is itself a kind of data.',
    "No sessions here. This view will improve once there's something to view.",
    'No sessions match this filter. Claude was busy elsewhere, or nowhere.',
  ],

  /** Models page with no model data — dry observation */
  empty_models: [
    'No models yet. Pick up where you left off.',
    'No model data. Start a conversation and a model will appear here.',
    'No models used. The field is quiet.',
    'Nothing to compare yet. Use a model and it will show up.',
    'No model data found. Claude is technically here, just not yet accounted for.',
  ],

  /** Projects page with no project data — brief, neutral */
  empty_projects: [
    'No projects yet.',
    'No projects found for this period.',
    'Nothing here. Projects appear once Claude has worked in them.',
    'No project data. Open a project and start a session.',
    'Empty. Projects populate as you use them.',
  ],

  /** Session detail with no turns — technically accurate, slightly bemused */
  empty_detail: [
    'This session has no recorded turns.',
    'No turns found. The session started but apparently said nothing.',
    'Nothing to show. Either the session was silent or something went wrong.',
    'No turns in this session. A brief, uneventful exchange with the void.',
    'This session contains no turns. Claude was present but had nothing to report.',
  ],

  /** Sessions page when total count crosses 100 — mock-impressed observation of commitment */
  milestone_100_sessions: [
    "100 sessions. That's commitment. Or dependency. Same thing.",
    'One hundred sessions. Claude does not remember any of them.',
    'A hundred sessions in. You are, at this point, a regular.',
    '100 sessions. The kind of number that suggests a pattern.',
    "One hundred sessions. Whatever you're building, you're building it.",
  ],

  /** ActivityHeatmap tooltip on 90th-percentile peak days — dry commentary on intensity */
  heatmap_peak: [
    'Some days you really needed Claude.',
    'A busy day. Claude was there for it, as always.',
    'Peak activity. Something was very urgent, or very interesting.',
    'A lot of sessions on this day. The graph has noted it.',
    'High activity. Claude kept up.',
  ],

  /** Chats page with no conversations matching current filter */
  empty_chats: [
    'No conversations found. Claude said nothing, or the filter is too specific.',
    'No chats here. Either nothing was said, or it was said elsewhere.',
    'Empty. The conversations will appear once there are conversations to appear.',
    'No matching chats. Try a different search or broaden the date range.',
    'No conversations yet. Open Claude Code and say something.',
  ],

  /** Chats feature disabled (--hide-messages was passed) */
  feature_disabled: [
    'You told me to hide. Remove --hide-messages when you are ready.',
    'Conversation content was explicitly hidden. Your call.',
    'Claude remembers the conversations. You chose to keep them private.',
    'The chats are there. You just asked me not to show them.',
    'Privacy mode engaged. Drop the --hide-messages flag to disengage.',
  ],
} satisfies Record<string, string[]>;

/**
 * Provider-keyed personality copy.
 * Claude jokes reference Claude behaviors; Cursor jokes reference tab completions/ghost text;
 * All-view jokes reference "AI friends". Same dry/deadpan register. 1-2 sentences. No exclamation marks.
 */
export const PROVIDER_QUIPS: Record<string, Record<string, string[]>> = {
  claude: {
    spend_any: [
      'Claude has been productive. Your wallet less so.',
      'The meter has started. Claude does not feel guilty about this.',
      'A small amount left your account. Claude is already working on the next one.',
    ],
    empty_overview: [
      'No Claude activity yet. It is patiently waiting.',
      'Claude has been quiet. Either that or the data is somewhere else.',
      'Nothing from Claude. The context window sits empty.',
    ],
  },
  cursor: {
    spend_any: [
      'Cursor has been busy. Tab completions are never free, apparently.',
      'Cursor spent some of your money. The ghost text keeps flowing.',
      'Some Cursor activity recorded. The autocomplete engine hums along.',
    ],
    empty_overview: [
      'No Cursor activity recorded. The ghost text is still free.',
      'Nothing from Cursor. The tab key rests unbothered.',
      'Cursor is silent. No completions, no cost.',
    ],
  },
  opencode: {
    spend_any: [
      'OpenCode has been running. The terminal keeps a tally.',
      'Some OpenCode activity. The open-source way still costs tokens.',
    ],
    empty_overview: [
      'No OpenCode activity yet. The terminal awaits.',
      'Nothing from OpenCode. Quiet in the terminal.',
    ],
  },
  all: {
    spend_any: [
      'Your AI friends have been busy. Expensive friends.',
      'Across all your tools, something was spent. The ledger grows.',
      'Multiple AI assistants, one bill. They are not coordinating, but the costs are.',
    ],
    empty_overview: [
      'No activity across any tools. Enjoy the silence.',
      'Nothing from any provider. A rare moment of fiscal peace.',
      'All quiet on the AI front. No tokens, no costs, no opinions.',
    ],
  },
};

/**
 * Returns a random quip from the given array.
 */
export function pickQuip(quips: string[]): string {
  return quips[Math.floor(Math.random() * quips.length)];
}

/**
 * Returns a provider-specific quip for the given category.
 * Falls back to the generic QUIPS if no provider-specific entry exists.
 * Returns null if no matching quips are found.
 */
export function pickProviderQuip(provider: string, category: string): string | null {
  const providerQuips = PROVIDER_QUIPS[provider]?.[category];
  if (providerQuips && providerQuips.length > 0) return pickQuip(providerQuips);
  // Fallback to generic quips
  const genericQuips = QUIPS[category as keyof typeof QUIPS];
  if (genericQuips && genericQuips.length > 0) return pickQuip(genericQuips);
  return null;
}

/**
 * Returns a quip based on total spend thresholds.
 * Returns null for zero spend (no quip shown).
 * Optional provider parameter selects provider-specific copy.
 */
export function pickSpendQuip(totalCostUsd: number, provider?: string): string | null {
  if (totalCostUsd >= 10000) return pickQuip(QUIPS.spend_10000);
  if (totalCostUsd >= 5000) return pickQuip(QUIPS.spend_5000);
  if (totalCostUsd >= 2500) return pickQuip(QUIPS.spend_2500);
  if (totalCostUsd >= 1000) return pickQuip(QUIPS.spend_1000);
  if (totalCostUsd >= 500) return pickQuip(QUIPS.spend_500);
  if (totalCostUsd >= 250) return pickQuip(QUIPS.spend_250);
  if (totalCostUsd >= 100) return pickQuip(QUIPS.spend_100);
  if (totalCostUsd >= 50) return pickQuip(QUIPS.spend_50);
  if (totalCostUsd >= 10) return pickQuip(QUIPS.spend_10);
  if (totalCostUsd >= 5) return pickQuip(QUIPS.spend_5);
  if (totalCostUsd >= 1) return pickQuip(QUIPS.spend_1);
  if (totalCostUsd > 0) {
    if (provider) return pickProviderQuip(provider, 'spend_any');
    return pickQuip(QUIPS.spend_any);
  }
  return null;
}
