import { Search, Network } from 'lucide-react';
import { contacts } from '../../data/mockData';
import { cn } from '../../utils/cn';

export default function ContactList({ onSelectContact, activeContactId }) {
    // Separate 'You' from others to match the mockup
    const systemContacts = contacts.filter(c => c.id !== 'user');
    const userContact = contacts.find(c => c.id === 'user');

    return (
        <div className="flex flex-col h-full bg-brand-bg w-full">
            {/* Search Bar */}
            <div className="px-4 py-3 sticky top-0 bg-brand-bg z-10 border-b border-slate-200/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher"
                        className="w-full bg-slate-200/60 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500 transition-shadow"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto w-full">
                {systemContacts.map(contact => (
                    <ContactItem
                        key={contact.id}
                        contact={contact}
                        onClick={() => onSelectContact(contact.id)}
                        isActive={contact.id === activeContactId}
                    />
                ))}

                {userContact && (
                    <div className="mt-4 pt-4 border-t border-slate-200/50 mx-4">
                        <ContactItem
                            contact={userContact}
                            onClick={() => onSelectContact(userContact.id)}
                            isActive={userContact.id === activeContactId}
                            isUser
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function ContactItem({ contact, onClick, isActive, isUser = false }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100/50 last:border-0",
                isActive ? "bg-slate-100" : "hover:bg-slate-50"
            )}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className={cn(
                    "w-12 h-12 rounded-full border flex items-center justify-center. overflow-hidden",
                    isUser
                        ? "border-slate-300 bg-slate-200"
                        : "border-slate-700 bg-slate-800"
                )}>
                    {isUser ? (
                        <span className="text-sm font-medium text-slate-500 flex items-center justify-center h-full w-full">you</span>
                    ) : (
                        <div className="relative flex items-center justify-center w-full h-full">
                            <Network className="w-7 h-7 text-blue-400" />
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white">N</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-semibold text-base text-slate-800 truncate">{contact.name}</h3>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">{contact.time}</span>
                </div>

                <p className="text-sm text-slate-500 truncate">{contact.role}</p>

                {/* Status indicator inline with last message OR role */}
                <div className="flex items-center gap-1.5 mt-0.5">
                    {contact.lastMessage ? (
                        <p className="text-sm text-slate-600 truncate">{contact.lastMessage}</p>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                contact.status === 'online' ? "bg-emerald-500" : "bg-slate-400"
                            )} />
                            <span className={contact.status === 'online' ? "text-emerald-600" : "text-slate-500"}>
                                {contact.role === 'en ligne' ? 'en ligne' : contact.status}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
