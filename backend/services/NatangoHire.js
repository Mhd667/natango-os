export async function onboardClient(data, liveTestDB, whatsappClient, supabase) {
    const { nom, telephone, quartier, agentName } = data;
    const cleanPhone = telephone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('221') ? cleanPhone : `221${cleanPhone}`;
    const chatId = `${finalPhone}@c.us`;

    try {
        // 1. NATANGO HIRE : Enregistre dans Supabase (Statut : En attente)
        const { error: dbError } = await supabase
            .from('clients')
            .upsert([{
                nom: nom,
                telephone: cleanPhone,
                quartier: quartier,
                statut_abonnement: 'En attente' // 👈 L'agent ne fait que sceller, il n'active pas.
            }], { onConflict: 'telephone' });

        if (dbError) throw new Error("Erreur BDD: " + dbError.message);

        // 2. NATANGO CUSTOMER lit la BDD et met à jour son Dashboard
        liveTestDB[chatId] = {
            nom: nom, quartier: quartier,
            statut: "En attente de paiement 🟡",
            enrolePar: agentName
        };

        // 3. NATANGO CUSTOMER envoie le lien Wave
        // ⚠️ N'oublie pas de mettre ton vrai numéro Wave ici
        const waveLink = `https://wave.com/pay/v1/221787825960?amount=3500`;
        const msgSouscription = `♻️ *NATANGO CUSTOMER* ♻️\n\nBonjour *${nom}*, bienvenue dans notre réseau !\n\nL'agent ${agentName} a bien sécurisé votre zone à ${quartier}.\nPour activer les ramassages quotidiens, veuillez régler votre souscription de *3500 FCFA* via ce lien Wave sécurisé :\n\n👉 ${waveLink}\n\nDès réception, Natango Account validera automatiquement votre compte.`;

        await whatsappClient.sendMessage(chatId, msgSouscription);

        return { success: true, message: "Client scellé ! Natango Customer a envoyé le lien Wave." };
    } catch (error) {
        return { success: false, error: error.message };
    }
}