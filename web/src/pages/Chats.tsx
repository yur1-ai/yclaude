import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChatCard } from '../components/ChatCard';
import { DateRangePicker } from '../components/DateRangePicker';
import { ProviderBadge } from '../components/ProviderBadge';
import { useChats } from '../hooks/useChats';
import { useConfig } from '../hooks/useConfig';
import { useProjects } from '../hooks/useProjects';
import type { ProviderId } from '../lib/providers';
import { QUIPS, pickQuip } from '../lib/quips';
import { useProviderStore } from '../store/useProviderStore';
import ChatsDisabled from './ChatsDisabled';

export default function Chats() {
  const navigate = useNavigate();
  const { data: config, isLoading: configLoading } = useConfig();
  const { provider } = useProviderStore();

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, page, setPage } = useChats(projectFilter, debouncedSearch);
  const { data: projectsData } = useProjects();

  // Reset to page 1 on filter change
  // biome-ignore lint/correctness/useExhaustiveDependencies: setPage is stable (useState setter)
  useEffect(() => {
    setPage(1);
  }, [projectFilter, debouncedSearch]);

  if (configLoading) {
    return <p className="text-slate-500 dark:text-[#8b949e] text-sm">Loading...</p>;
  }

  if (!config?.showMessages) {
    return <ChatsDisabled />;
  }

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50));
  const isAllView = provider === 'all';

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#e6edf3]">Chats</h1>
        <DateRangePicker />
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
        Conversation content is displayed. All data stays on your machine.
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <select
          value={projectFilter ?? ''}
          onChange={(e) => setProjectFilter(e.target.value || null)}
          className="rounded border border-slate-200 text-sm px-2 py-1.5 text-slate-600 bg-white dark:border-[#30363d] dark:text-[#8b949e] dark:bg-[#21262d]"
        >
          <option value="">All projects</option>
          {projectsData?.rows.map((p) => (
            <option key={p.cwd ?? 'unknown'} value={p.cwd ?? ''}>
              {p.displayName}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search conversations..."
          className="rounded border border-slate-200 text-sm px-3 py-1.5 text-slate-600 bg-white dark:border-[#30363d] dark:text-[#8b949e] dark:bg-[#21262d] placeholder:text-slate-400 dark:placeholder:text-[#484f58] flex-1"
        />
      </div>

      {/* Chat list */}
      {isLoading && (
        <p className="text-slate-500 dark:text-[#8b949e] text-sm">Loading conversations...</p>
      )}
      {isError && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
          <p className="text-red-500 text-sm">Failed to load conversations.</p>
        </div>
      )}
      {!isLoading && !isError && data && (
        <>
          {data.chats.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
              <p className="text-sm text-slate-500 dark:text-[#8b949e] italic">
                {pickQuip(QUIPS.empty_chats)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.chats.map((chat) => {
                const chatAny = chat as unknown as Record<string, unknown>;
                const chatProvider = chatAny.provider as ProviderId | undefined;
                const chatCostSource = chatAny.costSource as string | undefined;
                return (
                  <div key={chat.sessionId} className="relative">
                    {isAllView && chatProvider && (
                      <div className="absolute top-3 right-14 z-10">
                        <ProviderBadge provider={chatProvider} />
                      </div>
                    )}
                    <ChatCard
                      chat={chat}
                      searchQuery={debouncedSearch}
                      onViewConversation={(sessionId) => navigate(`/chats/${sessionId}`)}
                      costSourceLabel={
                        isAllView && chatCostSource
                          ? chatCostSource === 'reported'
                            ? 'rep.'
                            : 'est.'
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data.total > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-[#8b949e]">
              <span>
                Showing {(page - 1) * (data.pageSize ?? 50) + 1}&ndash;
                {Math.min(page * (data.pageSize ?? 50), data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-slate-200 dark:border-[#30363d] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#21262d]"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-slate-200 dark:border-[#30363d] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#21262d]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
