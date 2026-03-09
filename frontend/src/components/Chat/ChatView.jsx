import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';

export default function ChatView({ messages, onSendMessage }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        // Scroll to bottom on new message
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col min-h-full w-full py-4 pb-20 relative">
            {/* Messages */}
            <div className="flex-1 w-full space-y-1">
                {messages.map((msg, index) => {
                    // Add extra space before a new sender's message group if needed
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showSenderSpace = prevMsg && prevMsg.senderId !== msg.senderId && msg.type !== 'system';

                    return (
                        <div key={msg.id} className={showSenderSpace ? 'mt-3' : ''}>
                            <MessageBubble message={msg} />
                        </div>
                    );
                })}
                <div ref={bottomRef} className="h-4" />
            </div>

            <InputBar onSendMessage={onSendMessage} />
        </div>
    );
}
