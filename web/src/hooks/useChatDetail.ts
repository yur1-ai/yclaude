import { useQuery } from '@tanstack/react-query';

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolId?: string;
  toolUseId?: string;
  resultContent?: string;
  isError?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: string;
  model?: string;
  tokens?: { input: number; output: number; cacheCreation: number; cacheRead: number };
}

export interface ChatSummary {
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
  mainCostUsd: number;
  subagentCostUsd: number;
  hasSubagents: boolean;
}

export interface ChatDetailData {
  summary: ChatSummary;
  messages: ChatMessage[];
}

export function useChatDetail(sessionId: string | undefined) {
  return useQuery<ChatDetailData>({
    queryKey: ['chat-detail', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/chats/${sessionId}`);
      if (res.status === 404) throw new Error('Conversation not found');
      if (res.status === 403) throw new Error('Conversation viewing is disabled');
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json() as Promise<ChatDetailData>;
    },
    enabled: !!sessionId,
  });
}
