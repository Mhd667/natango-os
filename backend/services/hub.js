// =====================================================
// MODULE HUB : LE WINGMAN DU DIRECTEUR GÉNÉRAL
// =====================================================

export function initHubRoutes(app, { ai, supabase, pushEvent }) {

    app.post('/api/hub/health-report', async (req, res) => {
        if (!ai) return res.status(500).json({ success: false, message: "IA non initialisée." });

        try {
            pushEvent('DG', 'hub', `🔄 Natango Hub compile les données des 4 instances...`, 'system');

            // 1. COLLECTE DES DONNÉES DE TOUTE L'ENTREPRISE
            // (En production, tu fais de vraies requêtes Supabase COUNT et SUM ici)
            
            // Stats Ops (Terrain)
            const { count: pendingOps } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: completedOps } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
            
            // Stats RH (Hommes)
            const { count: activeAgents } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'Agent').eq('is_online', true);
            
            // Mock Stats Finance & CRM (A remplacer par tes vraies requêtes DB)
            const finances = { collected: 760000, missing: 64000 };
            const crm = { active: 412, target: 800 };

            // 2. LE PROMPT DU CHEF DE CABINET
            const systemPrompt = `Tu es Natango Hub, le Chef de Cabinet (Wingman) du Directeur Général.
Ta mission est de lire les données brutes de l'entreprise et de générer un "Bilan de Santé" exécutif, clair et direct, sans fioritures.
Ton ton est celui d'un conseiller de haut niveau (style Silicon Valley) : factuel, rassurant si tout va bien, proactif s'il y a des problèmes.

VOICI LES DONNÉES DU JOUR :
- Opérations : ${completedOps || 0} bacs vidés, ${pendingOps || 0} en attente.
- RH : ${activeAgents || 0} agents sur le terrain.
- Finances : ${finances.collected} CFA encaissés, ${finances.missing} CFA en impayés.
- Croissance : ${crm.active} / ${crm.target} foyers équipés de QR Codes.

RÉDIGE LE RAPPORT :
1. Un résumé en 2 phrases (Le statut général).
2. Ce qui s'est bien passé (Les victoires).
3. Ce qui nécessite l'attention du DG (Les frictions, ex: les impayés ou les urgences en attente).
4. Une recommandation d'action (Ce que Natango va faire ou propose de faire automatiquement).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: "Génère le Bilan de Santé de l'entreprise à cet instant." }] }],
                config: { systemInstruction: systemPrompt }
            });

            const report = response.text;

            // 3. ENVOI AU DASHBOARD DU DG
            pushEvent('DG', 'hub', `📊 BILAN DE SANTÉ GÉNÉRÉ.\n\n${report}`, 'system');

            res.json({ 
                success: true, 
                reply: {
                    type: 'health_report',
                    content: report,
                    time: new Date().toLocaleTimeString('fr-SN')
                }
            });

        } catch (error) {
            console.error("Erreur génération Hub:", error);
            res.status(500).json({ success: false });
        }
    });
}