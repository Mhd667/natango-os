import { useState } from 'react';
import { contacts, messages as initialMessages } from '../data/mockData';

export function useAppState() {
    const [currentView, setCurrentView] = useState('onboarding'); // 'onboarding', 'chat', 'contacts'
    const [activeContactId, setActiveContactId] = useState('1'); // Default to Natango Supervision
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [messages, setMessages] = useState(initialMessages);

    const activeContact = contacts.find(c => c.id === activeContactId);

    const navigateTo = (view) => {
        setCurrentView(view);
    };

    const openChat = (contactId) => {
        setActiveContactId(contactId);
        setCurrentView('chat');
    };

    const toggleDashboard = () => setIsDashboardOpen(!isDashboardOpen);

    const sendMessage = (content) => {
        const newMessage = {
            id: Date.now(),
            senderId: 'user',
            type: 'text',
            content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent'
        };
        setMessages(prev => [...prev, newMessage]);
    };

    return {
        currentView,
        navigateTo,
        activeContact,
        openChat,
        isDashboardOpen,
        toggleDashboard,
        messages,
        sendMessage,
        setIsDashboardOpen
    };
}
