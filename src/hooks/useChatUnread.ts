import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useChatStore } from '../store/chatStore';
import { listenToConversations, hasUnreadConversation } from '../services/chatService';

/**
 * Global unread-chat tracker (app boot). Feeds the red badge on the
 * Chat tab icon in CustomTabBar/TopTabBar. Mount once near the app root.
 */
export const useChatUnreadBadge = (): void => {
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const setUnreadCount = useChatStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (!user || !familyId) {
      setUnreadCount(0);
      return undefined;
    }
    const unsubscribe = listenToConversations(familyId, user.uid, (convos) => {
      setUnreadCount(convos.filter((c) => hasUnreadConversation(c, user.uid)).length);
    });
    return () => unsubscribe();
  }, [user?.uid, familyId, setUnreadCount]);
};
