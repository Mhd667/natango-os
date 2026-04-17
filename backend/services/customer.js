// =====================================================
// MODULE CUSTOMER : CRM IN-CHAT & GESTION QR CODE
// =====================================================

export function initCustomerRoutes(app, { ai, supabase, pushEvent }) {

    // =====================================================
    // 1. MISE À JOUR CRM VIA QR CODE (Terrain -> Backend)
    // =====================================================
    // Quand l'agent scanne le QR code, ou qu'on enregistre une nouvelle maison
    app.post('/api/customer/qr-update', async (req, res) => {
        const { qrId, residentName, residentPhone, zone, action } = req.body;

        try {
            if (action === 'register') {
                // Création du profil lié au QR Code
                // (Simulation base de données pour le prototype)
                pushEvent('DG', 'customer', `Nouvelle plaque QR Code activée pour la maison de ${residentName} (Zone: ${zone}).`, 'system');
                return res.json({ success: true, message: "Maison enregistrée et liée au QR Code." });
            }

            if (action === 'scan_pickup') {
                // L'agent a scanné pour vider la poubelle
                pushEvent('DG', 'customer', `QR Code scanné : Bac vidé chez ${residentName}. Mise à jour du CRM.`, 'system');
                
                // Le CRM déclenche le pont WhatsApp pour demander l'avis du client
                pushEvent('System', 'whatsapp_out', JSON.stringify({
                    action: "verify_pickup",
                    citizenName: residentName,
                    citizenPhone: residentPhone
                }), 'trigger_whatsapp');

                return res.json({ success: true, message: "CRM mis à jour et audit WhatsApp déclenché." });
            }

            res.status(400).json({ success: false });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 2. SIMULATEUR WHATSAPP (Retour du client)
    // =====================================================
    app.post('/api/mock-whatsapp/action', async (req, res) => {
        const { action, citizenPhone, citizenName } = req.body;
        
        try {
            if (action === 'payment_received') {
                pushEvent('DG', 'account', `💰 Paiement WhatsApp reçu de ${citizenName}.`, 'system');
                pushEvent('DG', 'customer', `🎉 Le QR Code de ${citizenName} est de nouveau actif suite au paiement.`, 'system');
                return res.json({ success: true });
            }

            if (action === 'verify_pickup_yes') {
                pushEvent('DG', 'customer', `✅ Audit Client : ${citizenName} confirme sur WhatsApp que son bac a été parfaitement vidé.`, 'system');
                return res.json({ success: true });
            }

            res.status(400).json({ success: false });
        } catch(e) {
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 3. LE CERVEAU CRM (CHAT IN-APP AVEC TOOL CALLING)
    // =====================================================
    
    // Outils tactiques pour que Gemini génère des Widgets ou des fichiers
    const customerTools = [{
        functionDeclarations: [
            {
                name: "show_crm_dashboard",
                description: "Affiche le widget visuel des statistiques du CRM dans le chat (taux d'adhésion, nombre de QR codes actifs). À utiliser quand l'utilisateur demande à voir le dashboard, les stats ou les chiffres des clients.",
                parameters: { type: "OBJECT", properties: {} }
            },
            {
                name: "export_excel",
                description: "Génère un fichier Excel/CSV de la base de données clients. À utiliser UNIQUEMENT quand l'utilisateur demande explicitement un fichier Excel, un CSV ou un export de la liste.",
                parameters: { type: "OBJECT", properties: {} }
            }
        ]
    }];

    app.post('/api/customer/chat', async (req, res) => {
        const { message, history = [] } = req.body;
        if (!ai) return res.status(500).json({ success: false, message: "IA non initialisée." });

        try {
            const systemPrompt = `Tu es Natango Customer, l'Intelligence Opérationnelle du CRM.
            La cité a un objectif de 800 foyers. 412 maisons ont activé leur QR Code (Adhérents). 380 sont à jour de paiement.
            Tu as accès à deux outils : 'show_crm_dashboard' pour afficher des graphiques, et 'export_excel' pour générer des fichiers.
            Si on te pose une question générale, réponds avec concision et professionnalisme.`;

            const contents = history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
            contents.push({ role: 'user', parts: [{ text: message }] });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: { 
                    systemInstruction: systemPrompt,
                    tools: customerTools
                }
            });

            // Vérification si Gemini a décidé d'utiliser un outil (Widget ou Excel)
            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];

                // CAS 1 : L'utilisateur veut voir le Dashboard intégré
                if (call.name === 'show_crm_dashboard') {
                    const dashboardData = {
                        target: 800,
                        activeQR: 412,
                        upToDate: 380,
                        satisfaction: "98%"
                    };
                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'widget_dashboard',
                            content: "Voici les statistiques actuelles du CRM issues des scans QR :",
                            data: dashboardData,
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }

                // CAS 2 : L'utilisateur veut le fichier Excel
                if (call.name === 'export_excel') {
                    // Génération d'un fichier CSV à la volée (le format le plus robuste)
                    const csvContent = "Nom,Telephone,Zone,Statut QR,Dernier Paiement\n" +
                                       "Ousmane Diop,+221770000001,Zone Nord,Actif,10/04/2026\n" +
                                       "Awa Ndiaye,+221770000002,Zone Sud,Actif,08/04/2026\n" +
                                       "Moussa Fall,+221770000003,Zone Est,Suspendu,15/03/2026";
                    
                    const base64Csv = Buffer.from(csvContent).toString('base64');

                    return res.json({ 
                        success: true, 
                        reply: {
                            type: 'file_export',
                            content: "J'ai généré le fichier de la base de données clients. Vous pouvez le télécharger ci-dessous.",
                            fileName: "Natango_CRM_Export.csv",
                            fileData: base64Csv,
                            mimeType: "text/csv",
                            time: new Date().toLocaleTimeString('fr-SN')
                        } 
                    });
                }
            }

            // CAS 3 : Réponse texte classique
            res.json({ 
                success: true, 
                reply: {
                    type: 'text_out',
                    content: response.text,
                    time: new Date().toLocaleTimeString('fr-SN')
                }
            });

        } catch (error) {
            console.error("Erreur chat CRM:", error);
            res.status(500).json({ success: false });
        }
    });
}