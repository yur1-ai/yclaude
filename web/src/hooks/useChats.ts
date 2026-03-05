import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDateRangeStore } from '../store/useDateRangeStore';

export interface ChatItem {
  sessionId: string;
  displayName: string;
  cwd: string | null;
  model: string;
  costUsd: number;
  timestamp: string;
  firstMessage: string;
  firstMessageFull: string;
  turnCount: number;
}

export interface ChatsData {
  chats: ChatItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function useChats(projectFilter: string | null = null, searchQuery = '') {
  const { from, to } = useDateRangeStore();
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (projectFilter) params.set('project', projectFilter);
  if (searchQuery) params.set('search', searchQuery);
  params.set('page', String(page));

  const query = useQuery<ChatsData>({
    queryKey: [
      'chats',
      from?.toISOString(),
      to?.toISOString(),
      projectFilter,
      searchQuery,
      page,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/v1/chats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch chats');
      return res.json() as Promise<ChatsData>;
    },
  });

  return { ...query, page, setPage };
}
