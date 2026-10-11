import { Friend, SharedOrder, FriendRequest, Notification, PrivacySettings, User } from '../types/social';

const FRIENDS_KEY = 'muncheez_friends';
const REQUESTS_KEY = 'muncheez_friend_requests';
const SHARED_ORDERS_KEY = 'muncheez_shared_orders';
const NOTIFICATIONS_KEY = 'muncheez_notifications';
const PRIVACY_KEY = 'muncheez_privacy';

const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Zipporah', username: 'zippy_fast', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zipporah' },
    { id: 'u2', name: 'Kevin', username: 'kev_orders', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin' },
    { id: 'u3', name: 'Sarah', username: 'sarah_eats', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 'u4', name: 'Mike', username: 'mike_pizza', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: 'u5', name: 'Elena', username: 'elena_chef', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
];

const INITIAL_FRIENDS: Friend[] = [];
const INITIAL_ORDERS: SharedOrder[] = [];

export const socialService = {
    getFriends: (): Friend[] => {
        const stored = localStorage.getItem(FRIENDS_KEY);
        if (!stored) {
            localStorage.setItem(FRIENDS_KEY, JSON.stringify(INITIAL_FRIENDS));
            return INITIAL_FRIENDS;
        }
        return JSON.parse(stored);
    },

    getFriendRequests: (): FriendRequest[] => {
        const stored = localStorage.getItem(REQUESTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    getNotifications: (): Notification[] => {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    getUnreadNotificationCount: (): number => {
        return socialService.getNotifications().filter(n => !n.read).length;
    },

    getSharedOrders: (): SharedOrder[] => {
        const stored = localStorage.getItem(SHARED_ORDERS_KEY);
        if (!stored) {
            localStorage.setItem(SHARED_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
            return INITIAL_ORDERS;
        }
        return JSON.parse(stored);
    },

    getPrivacySettings: (): PrivacySettings => {
        const stored = localStorage.getItem(PRIVACY_KEY);
        if (!stored) {
            const defaults: PrivacySettings = {
                shareOrdersWithFriends: true,
                allowSurpriseGifts: true,
                showMaskedAddress: true,
                visibilityLevel: 'all_friends',
                allowedGiftingFriends: []
            };
            localStorage.setItem(PRIVACY_KEY, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(stored);
    },

    updatePrivacySettings: (settings: PrivacySettings) => {
        localStorage.setItem(PRIVACY_KEY, JSON.stringify(settings));
    },

    searchUsers: (query: string): User[] => {
        if (!query) return [];
        const normalizedQuery = query.toLowerCase();
        return MOCK_USERS.filter(u =>
            u.name.toLowerCase().includes(normalizedQuery) ||
            u.username.toLowerCase().includes(normalizedQuery)
        );
    },

    sendFriendRequest: (fromUser: User, toId: string) => {
        const requests = socialService.getFriendRequests();
        const newRequest: FriendRequest = {
            id: Math.random().toString(36).substr(2, 9),
            from: fromUser,
            toId,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(REQUESTS_KEY, JSON.stringify([...requests, newRequest]));

        socialService.addNotification({
            id: Math.random().toString(36).substr(2, 9),
            type: 'friend_request',
            from: fromUser,
            message: `${fromUser.name} sent you a friend request!`,
            timestamp: new Date().toISOString(),
            read: false
        });
    },

    acceptFriendRequest: (requestId: string) => {
        const requests = socialService.getFriendRequests();
        const request = requests.find(r => r.id === requestId);
        if (request) {
            const friends = socialService.getFriends();
            const newFriend: Friend = {
                ...request.from,
                status: 'accepted',
                allowGifting: true,
                allowOrderVisibility: true,
                maskedAddress: `${request.from.name.toLowerCase()}#${Math.floor(Math.random() * 99) + 1}`,
                lastActive: new Date().toISOString()
            };
            localStorage.setItem(FRIENDS_KEY, JSON.stringify([...friends, newFriend]));
            localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests.filter(r => r.id !== requestId)));
        }
    },

    addReaction: (orderId: string, emoji: string, userId: string) => {
        const orders = socialService.getSharedOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const reaction = order.reactions.find(r => r.emoji === emoji);
            if (reaction) {
                if (!reaction.userIds.includes(userId)) {
                    reaction.userIds.push(userId);
                    reaction.count++;
                }
            } else {
                order.reactions.push({ emoji, count: 1, userIds: [userId] });
            }
            localStorage.setItem(SHARED_ORDERS_KEY, JSON.stringify(orders));
        }
    },

    addNotification: (notification: Notification) => {
        const notifications = socialService.getNotifications();
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([notification, ...notifications]));
    },

    markNotificationsAsRead: () => {
        const notifications = socialService.getNotifications().map(n => ({ ...n, read: true }));
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    },

    createGiftOrder: (friendId: string, _items: any[], sender: User) => {
        const friend = socialService.getFriends().find(f => f.id === friendId);
        if (friend) {
            socialService.addNotification({
                id: Math.random().toString(36).substr(2, 9),
                type: 'gift_received',
                from: sender,
                message: `${sender.name} sent you a surprise gift to ${friend.maskedAddress}!`,
                timestamp: new Date().toISOString(),
                read: false
            });
            return true;
        }
        return false;
    }
};
