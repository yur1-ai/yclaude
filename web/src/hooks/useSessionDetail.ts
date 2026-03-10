import { useQuery } from '@tanstack/react-query';
import { useProviderStore } from '../store/useProviderStore';

export interface TurnRow extends Record<string, unknown> {
  turn: number;
  model: string;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  costUsd: number;
  cumulativeCost: number;
  timestamp: string;
}

export interface SessionSummary {
  sessionId: string;
  displayName: string;
  cwd: string | null;
  model: string;
  models: string[];
  totalCost: number;
  totalTokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  timestamp: string;
  durationMs: number | null;
  gitBranch: string | null;
  mainCostUsd?: number;
  subagentCostUsd?: number;
  hasSubagents?: boolean;
}

export interface SessionDetailData {
  summary: SessionSummary;
  turns: TurnRow[];
}

export function useSessionDetail(sessionId: string | undefined) {
  const { provider } = useProviderStore();

  return useQuery<SessionDetailData>({
    queryKey: ['session-detail', sessionId, provider],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sessions/${sessionId}`);
      if (res.status === 404) throw new Error('Session not found');
      if (!res.ok) throw new Error('Failed to fetch session detail');
      return res.json() as Promise<SessionDetailData>;
    },
    enabled: !!sessionId,
  });
}
