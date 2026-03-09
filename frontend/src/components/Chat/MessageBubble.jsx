import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function MessageBubble({ message }) {
    const isUser = message.senderId === 'user';
    const isSystem = message.type === 'system';
    const isAction = message.type === 'actions';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4">
                <div className="bg-slate-200/50 px-4 py-2 rounded-2xl text-xs text-slate-500 text-center max-w-[80%] whitespace-pre-wrap">
                    {message.content}
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (isAction && message.actions) {
            return (
                <div className="flex flex-wrap gap-2 mt-2">
                    {message.actions.map((action, idx) => (
                        <button
                            key={idx}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                                action.variant === 'primary'
                                    ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                                    : "bg-slate-200/50 text-slate-700 hover:bg-slate-200"
                            )}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            );
        }

        // Add logic here for Audio or Document if needed later based on message.type
        return <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</div>;
    };

    return (
        <div className={cn(
            "flex w-full mb-4 px-4 isolate",
            isUser ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "relative max-w-[85%] px-4 py-3",
                // The WhatsApp-style tail - we use a custom clip-path in tailwind config or a pseudo-element
                // For simplicity, using rounded corners that mimic the bubble shape
                isUser
                    ? "bg-brand-user text-slate-800 rounded-2xl rounded-tr-sm"
                    : "bg-brand-natango text-slate-800 rounded-2xl rounded-tl-sm",
                isAction && "w-full max-w-[95%] bg-transparent p-0 rounded-none" // Actions are often raw buttons below a text
            )}>
                {!isAction && renderContent()}
                {isAction && renderContent()}

                {/* Timestamp & Status */}
                {!isAction && (
                    <div className={cn(
                        "flex items-center gap-1 mt-1 text-[11px] font-medium opacity-60",
                        isUser ? "justify-end" : "justify-end" // Both align to right of bubble usually
                    )}>
                        <span>{message.timestamp}</span>
                        {isUser && (
                            message.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                            ) : (
                                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
