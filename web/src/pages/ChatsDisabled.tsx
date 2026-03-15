import { QUIPS, pickQuip } from '../lib/quips';

export default function ChatsDisabled() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#e6edf3]">
        Conversation Viewer
      </h1>
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <p className="text-sm text-slate-600 dark:text-[#8b949e] mb-4">
          Conversation content has been hidden because{' '}
          <code className="text-xs bg-slate-100 dark:bg-[#21262d] px-1.5 py-0.5 rounded font-mono">
            --hide-messages
          </code>{' '}
          was passed. Remove that flag to browse your conversations.
        </p>
        <div className="rounded-md bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] px-4 py-3 font-mono text-sm text-slate-800 dark:text-[#e6edf3]">
          npx yclaude
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-[#8b949e]">
          All data stays on your machine. No content is sent anywhere.
        </p>
        <p className="mt-4 text-xs text-slate-400 dark:text-[#8b949e] italic">
          {pickQuip(QUIPS.feature_disabled)}
        </p>
      </div>
    </div>
  );
}
