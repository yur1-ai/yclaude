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

  /** Chats feature disabled (--show-messages not passed) */
  feature_disabled: [
    'This feature is behind a locked door. The key is --show-messages.',
    'Conversation content stays private by default. Unlock it when you are ready.',
    'Claude remembers the conversations. Displaying them is your call.',
    'Privacy first. Conversation viewing is opt-in, not opt-out.',
    'The chats are there. You just have not asked to see them yet.',
  ],
} satisfies Record<string, string[]>;

/**
 * Returns a random quip from the given array.
 */
export function pickQuip(quips: string[]): string {
  return quips[Math.floor(Math.random() * quips.length)];
}

/**
 * Returns a quip based on total spend thresholds.
 * Returns null for zero spend (no quip shown).
 */
export function pickSpendQuip(totalCostUsd: number): string | null {
  if (totalCostUsd >= 100) return pickQuip(QUIPS.spend_100);
  if (totalCostUsd >= 50) return pickQuip(QUIPS.spend_50);
  if (totalCostUsd >= 10) return pickQuip(QUIPS.spend_10);
  if (totalCostUsd >= 5) return pickQuip(QUIPS.spend_5);
  if (totalCostUsd >= 1) return pickQuip(QUIPS.spend_1);
  if (totalCostUsd > 0) return pickQuip(QUIPS.spend_any);
  return null;
}
