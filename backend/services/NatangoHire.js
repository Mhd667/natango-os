export async function onboardClient(data, liveTestDB, whatsappClient, supabase) {
    const { nom, villa, phone, qrId, lat, lng } = data;
    
    // 1. Nettoyage et formatage du numéro (Standard Sénégal)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('221') ? cleanPhone : `221${cleanPhone}`;
    const chatId = `${finalPhone}@c.us`;

    try {
        // 2. NATANGO HIRE : Enregistre dans la table dédiée 'onboarding'
        if (supabase) {
            const { error: dbError } = await supabase
                .from('onboarding')
                .upsert([{
                    telephone: cleanPhone,
                    nom: nom,
                    villa: villa,
                    qr_code_id: qrId,
                    gps_latitude: parseFloat(lat),
                    gps_longitude: parseFloat(lng),
                    statut: 'En attente'
                }], { onConflict: 'telephone' });

            if (dbError) throw new Error("Erreur BDD Onboarding: " + dbError.message);
            console.log("✅ Données scellées dans la table 'onboarding'.");
        }

        // 3. NATANGO CUSTOMER : Mise à jour du Dashboard en mémoire
        liveTestDB[chatId] = {
            nom: nom, 
            villa: villa,
            qrId: qrId,
            statut: "En attente de paiement 🟡",
            dateOnboarding: new Date().toISOString()
        };

        // 4. NATANGO CUSTOMER : Envoi du message de bienvenue et lien Wave
        const waveLink = `https://wave.com/pay/v1/221787825960?amount=3500`;
        const msgSouscription = `♻️ *NATANGO CUSTOMER* ♻️\n\nBonjour *${nom}*, bienvenue dans notre réseau !\n\nVotre Villa (*${villa}*) a été officiellement intégrée. Votre bac est scellé (ID: ${qrId}).\n\nPour activer les ramassages quotidiens, veuillez régler votre souscription de *3500 FCFA* via ce lien Wave sécurisé :\n\n👉 ${waveLink}\n\nDès réception, Natango Account validera automatiquement votre compte.`;

        if (whatsappClient) {
            await whatsappClient.sendMessage(chatId, msgSouscription);
        }

        return { success: true, message: "Client scellé ! Natango Customer a envoyé le lien Wave." };
    } catch (error) {
        console.error("❌ Erreur NatangoHire:", error.message);
        return { success: false, error: error.message };
    }
}