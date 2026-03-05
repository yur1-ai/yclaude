import { useConfig } from '../hooks/useConfig';
import ChatsDisabled from './ChatsDisabled';

export default function Chats() {
  const { data: config, isLoading } = useConfig();

  if (isLoading) {
    return <p className="text-slate-500 dark:text-[#8b949e] text-sm">Loading...</p>;
  }

  if (!config?.showMessages) {
    return <ChatsDisabled />;
  }

  // Full chat list page will be built in Task 2
  return <div>Chats enabled</div>;
}
