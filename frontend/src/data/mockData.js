export const contacts = [
    { id: '1', name: 'Natango', role: 'Supervision active', status: 'online', isMain: true, avatar: 'blue', lastMessage: 'Stabilisation confirmée. Saturation évitée.', time: '20:07' },
    { id: '2', name: 'Natango RH', role: 'Gestion du personnel', status: 'offline', isMain: false, avatar: 'blue', lastMessage: 'Check-in enregistré à 07:58.', time: '07:58' },
    { id: '3', name: 'Natango Hub', role: 'Assistant directeur des opérations.', status: 'offline', isMain: false, avatar: 'blue', lastMessage: 'Pic principal resté à la mi-temps.', time: 'hier' },
    { id: '4', name: 'Natango Marketing', role: 'Rapports et infographies.', status: 'offline', isMain: false, avatar: 'blue', lastMessage: 'Infographie impact prêt.', time: 'hier' },
    { id: 'user', name: 'You', role: 'en ligne', status: 'online', isMain: false, avatar: 'gray', lastMessage: '', time: '' }
];

export const messages = [
    {
        id: 1,
        senderId: '1',
        type: 'text',
        content: "La Zone A s'accélère plus vite que prévu.\nJe déclenche une intervention préventive.",
        timestamp: '20:03'
    },
    {
        id: 2,
        senderId: '1',
        type: 'text',
        content: "Équipe 2 déployée.\nStabilisation estimée sous 8 minutes.",
        timestamp: '20:05'
    },
    {
        id: 3,
        senderId: 'user',
        type: 'text',
        content: "Parfait, je continue.",
        timestamp: '20:05',
        status: 'read'
    },
    {
        id: 4,
        senderId: '1',
        type: 'text',
        content: "Ajustement en cours suite contrainte terrain. Intervention redirigée automatiquement.\nImpact maîtrisé.",
        timestamp: '20:05'
    },
    {
        id: 5,
        senderId: '1',
        type: 'actions',
        actions: [
            { label: 'Missuis', variant: 'secondary' },
            { label: 'Voir trajet', variant: 'primary' },
            { label: 'Terminé', variant: 'secondary' }
        ],
        timestamp: '20:05'
    },
    {
        id: 6,
        senderId: 'system',
        type: 'system',
        content: "Mode autonome activé.\nJ'interviendrai de manière préventive si nécessaire.\nVous serez informé en temps réel.",
        timestamp: '20:06' // Simulated from the modal screenshot context
    },
    {
        id: 7,
        senderId: '1',
        type: 'text',
        content: "Stabilisation confirmée.\nSaturation évitée.",
        timestamp: '20:07'
    }
];
