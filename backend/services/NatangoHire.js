/**
 * Logique de scellement des données terrain pour Natango
 * @param {Object} data - Données du formulaire (nom, villa, phone, qrId, coords)
 * @param {Object} db - La base de données live (liveTestDB)
 * @param {Object} whatsapp - Le client WhatsApp déjà initialisé
 */
export const onboardClient = async (data, db, whatsapp) => {
    const { nom, villa, phone, qrId, lat, lng } = data;

    // 1. Nettoyage et formatage du numéro (Standard Sénégal)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chatId = cleanPhone.startsWith('221') ? `${cleanPhone}@c.us` : `221${cleanPhone}@c.us`;

    // 2. Le Scellement (Alimentation des 3 pôles : Customer, Account, Ops)
    db[chatId] = {
        nom: nom,
        villa: villa,
        qrId: qrId,
        location: {
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        },
        statut: "En attente", // Statut initial pour Lisa (Account)
        dateOnboarding: new Date().toISOString()
    };

    console.log(`📍 [HIRE] Villa ${villa} scellée avec succès.`);

    // 3. Activation de Ndeye Fatou (Message de bienvenue)
    const welcomeMsg = `🌟 *BIENVENUE CHEZ NATANGO* 🌟\n\nBonjour ${nom},\n\nVotre Villa (${villa}) a été officiellement intégrée au réseau Natango. Votre bac est scellé sous l'ID : *${qrId}*.\n\nJe suis votre assistante personnelle pour la gestion de vos déchets. À très bientôt ! ♻️`;

    try {
        if (whatsapp && whatsapp.info) {
            await whatsapp.sendMessage(chatId, welcomeMsg);
        }
        return { success: true, chatId };
    } catch (error) {
        console.error("Erreur d'envoi du message de bienvenue:", error);
        // On retourne quand même success car le profil est créé en base
        return { success: true, warning: "WhatsApp non envoyé" };
    }
};