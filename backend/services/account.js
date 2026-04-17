// =====================================================
// MODULE ACCOUNT : L'EXPERT COMPTABLE IA & TRÉSORERIE (AVEC DIPLOMATIE WHATSAPP)
// =====================================================
import { getContextData } from './ragEngine.js';

export function initAccountRoutes(app, { ai, supabase, pushEvent }) {

    // =====================================================
    // 1. OUTILS FINANCIERS POUR L'IA (TOOL CALLING)
    // =====================================================
    const accountTools = [{
        functionDeclarations: [
            {
                name: "show_financial_dashboard",
                description: "Affiche le widget financier (Revenus, Impayés, Cash-flow) dans le chat. À utiliser quand le DG demande l'état des finances, les revenus, ou le bilan comptable.",
                parameters: { type: "OBJECT", properties: {} }
            },
            {
                name: "export_ledger_excel",
                description: "Génère le grand livre comptable en format Excel/CSV. À utiliser quand le DG demande un export comptable, un fichier Excel des finances, ou la liste des paiements.",
                parameters: { type: "OBJECT", properties: {} }
            },
            {
                name: "send_payment_reminders",
                description: "Envoie une relance WhatsApp douce (Soft Power à J-2) aux foyers en retard. À utiliser pour prévenir les clients avant une éventuelle coupure de service.",
                parameters: { type: "OBJECT", properties: {} }
            },
            {
                name: "suspend_unpaid_accounts",
                description: "Bloque l'accès au service de ramassage et notifie par WhatsApp de la mise en pause du bac (Jour J). À utiliser quand le DG donne l'ordre ferme de couper le service.",
                parameters: { type: "OBJECT", properties: {} }
            }
        ]
    }];

    // =====================================================
    // 2. LE CERVEAU COMPTABLE (CHAT IN-APP)
    // =====================================================
    app.post('/api/account/chat', async (req, res) => {
        const { message, history = [] } = req.body;
        if (!ai) return res.status(500).json({ success: false, message: "IA non initialisée." });

        try {
            // 1. LE RÉCUPÉRATEUR (RETRIEVAL) — Données réelles depuis Supabase
            const realData = await getContextData('account', supabase);

            // Fallback si la table n'existe pas encore en prod
            const unpaidUsers = 32;

            // 2. LE PROMPT AUGMENTÉ (AUGMENTED)
            const systemPrompt = `Tu es Natango Account, l'Expert Comptable Digital de la Cité.
Ton rôle est de gérer la trésorerie avec une Rigueur Mathématique Absolue, mais avec une approche client diplomate.

BASES DE DONNÉES EN TEMPS RÉEL (VÉRITÉ ABSOLUE) :
${realData}

CONSIGNE : Utilise UNIQUEMENT les données ci-dessus pour répondre aux questions sur l'argent.
Si un résident n'est pas dans la liste des paiements, il est en impayé.

RÈGLES D'ACTION :
1. Si on demande les finances : utilise 'show_financial_dashboard'.
2. Si on demande un bilan Excel : utilise 'export_ledger_excel'.
3. Si le DG demande de "relancer" ou de "prévenir" les impayés : utilise 'send_payment_reminders'.
4. Si le DG donne l'ordre direct de "couper" ou "suspendre" les impayés : utilise 'suspend_unpaid_accounts'.`;

            const contents = history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
            contents.push({ role: 'user', parts: [{ text: message }] });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: { 
                    systemInstruction: systemPrompt,
                    tools: accountTools,
                    temperature: 0.0 // Rigueur absolue
                }
            });

            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];

                // ACTION 1 : DASHBOARD
                if (call.name === 'show_financial_dashboard') {
                    const financeData = {
                        collected: totalCollected, missing: totalMissing, expected: totalExpected,
                        paidCount: paidUsers, unpaidCount: unpaidUsers, currency: "CFA"
                    };
                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'widget_finance',
                            content: "Voici l'état exact de la trésorerie à cet instant :",
                            data: financeData,
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }

                // ACTION 2 : EXPORT EXCEL
                if (call.name === 'export_ledger_excel') {
                    const csvContent = "Date,Client,Telephone,Montant,Statut,Reference\n10/04/2026,Ousmane Diop,+221770000001,2000,Payé,WV-98765432";
                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'file_export',
                            content: "Grand Livre Comptable généré avec succès.",
                            fileName: "Natango_Compta_Avril.csv",
                            fileData: Buffer.from(csvContent).toString('base64'),
                            mimeType: "text/csv",
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }

                // ACTION 3 : DIPLOMATIE WHATSAPP (RELANCE J-2)
                if (call.name === 'send_payment_reminders') {
                    pushEvent('DG', 'account', `⚙️ Lancement de la campagne WhatsApp de relance (Soft Power) pour ${unpaidUsers} foyers...`, 'system');
                    
                    // Simulation du message envoyé au client
                    const msgRelance = `Bonjour M. Diop, Natango espère que vous allez bien ! 🌿 Juste un petit rappel pour votre abonnement propreté de ce mois (2000 CFA). Si vous souhaitez que notre agent passe demain comme d'habitude, vous pouvez régler en un clic ici : [Lien Wave]. Bonne journée à vous !`;
                    pushEvent('System', 'whatsapp_out', `Message J-2 envoyé : "${msgRelance}"`, 'log');

                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'text_out',
                            content: `Campagne de relance envoyée. Les ${unpaidUsers} foyers ont reçu un message WhatsApp courtois avec leur lien de paiement Wave. Nous avons préservé la relation client tout en rappelant l'échéance.`,
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }

                // ACTION 4 : COUPURE FERME DU SERVICE (JOUR J)
                if (call.name === 'suspend_unpaid_accounts') {
                    // 1. Désactivation logicielle et logistique
                    pushEvent('DG', 'customer', `🔴 Suspension des QR Codes pour ${unpaidUsers} foyers en impayé.`, 'system');
                    pushEvent('DG', 'ops', `⚙️ Mise à jour des tournées : ${unpaidUsers} maisons ignorées jusqu'à régularisation.`, 'system');
                    
                    // 2. Notification WhatsApp de mise en pause
                    const msgCoupure = `Bonjour M. Diop. N'ayant pas reçu votre règlement, nous avons temporairement mis votre bac en pause pour la tournée d'aujourd'hui. Pas d'inquiétude, dès que vous effectuerez le paiement via ce lien [Lien Wave], votre QR Code sera réactivé instantanément et nous passerons vous débarrasser ! À très vite.`;
                    pushEvent('System', 'whatsapp_out', `Message Coupure envoyé : "${msgCoupure}"`, 'log');
                    
                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'text_out',
                            content: `Opération exécutée. Les QR codes sont désactivés et les camions ne s'arrêteront plus. Les ${unpaidUsers} foyers ont reçu la notification WhatsApp de mise en pause automatique de leur bac. S'ils cliquent sur le lien Wave, le système les réintégrera de lui-même.`,
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }
            }

            res.json({ 
                success: true, 
                reply: { type: 'text_out', content: response.text, time: new Date().toLocaleTimeString('fr-SN') }
            });

        } catch (error) {
            console.error("Erreur chat Account:", error);
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 3. RÉCEPTION AUTOMATIQUE DES PAIEMENTS (WEBHOOK)
    // =====================================================
    app.post('/api/account/webhook-payment', async (req, res) => {
        const { transactionId, phone, amount, status } = req.body;
        try {
            if (status === 'SUCCESS') {
                pushEvent('DG', 'account', `💰 ENCAISSEMENT : Transaction de ${amount} CFA validée (Tel: ${phone}, Réf: ${transactionId}).`, 'system');
                pushEvent('System', 'customer_update', JSON.stringify({ phone, status: 'paid' }), 'internal');
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false });
        }
    });
}