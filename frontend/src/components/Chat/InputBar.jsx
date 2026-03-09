import { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';

export default function InputBar({ onSendMessage }) {
    const [text, setText] = useState('');
    const inputRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [text]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text.trim());
            setText('');
            if (inputRef.current) inputRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="fixed bottom-[64px] left-0 right-0 max-w-md mx-auto bg-brand-bg/80 backdrop-blur-md pb-safe-bottom z-30 flex items-end gap-2 px-3 py-2 border-t border-slate-200">

            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 flex self-end">
                <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            <form
                onSubmit={handleSubmit}
                className="flex-1 bg-white rounded-2xl flex items-end min-h-[44px] px-3 py-1 shadow-sm border border-slate-200 relative"
            >
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrire un message..."
                    className="w-full flex-1 max-h-[120px] bg-transparent outline-none resize-none py-2 text-[15px] text-slate-800 placeholder:text-slate-400"
                    rows={1}
                />
            </form>

            {text.trim() ? (
                <button
                    onClick={handleSubmit}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex-shrink-0 flex self-end shadow-md shadow-blue-500/20"
                >
                    <Send className="w-5 h-5 -ml-0.5" />
                </button>
            ) : (
                <button className="p-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 flex self-end">
                    <Mic className="w-6 h-6" />
                </button>
            )}

        </div>
    );
}
