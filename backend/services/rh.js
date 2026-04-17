// =====================================================
// MODULE RH : GESTION DES AGENTS, CHECK-INS & PERFORMANCES
// =====================================================

function parseBase64Image(base64Image) {
    let mimeType = 'image/jpeg';
    let imageData = base64Image;
    if (base64Image.startsWith('data:')) {
        const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
            mimeType = match[1];
            imageData = match[2];
        }
    }
    return { mimeType, data: imageData };
}

export function initRhRoutes(app, { ai, supabase, pushEvent }) {

    // --- UTILITAIRE GEMINI VISION (MODE STRICT) ---
    async function analyzeImageWithGemini(base64Image, prompt) {
        if (!ai) throw new Error("Client Gemini non initialisé.");
        const img = parseBase64Image(base64Image);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { inlineData: { mimeType: img.mimeType, data: img.data } },
                { text: prompt }
            ],
            config: {
                temperature: 0.0, // Zéro tolérance
                responseMimeType: "application/json",
            }
        });
        return response.text;
    }

    // =====================================================
    // 1. TRACKING GPS EN DIRECT (HEARTBEAT)
    // =====================================================
    app.post('/api/heartbeat', async (req, res) => {
        const { phone, lat, lng, name } = req.body;
        try {
            await supabase.from('users').upsert({
                phone_number: phone,
                name: name,
                role: 'Agent',
                last_lat: lat,
                last_lng: lng,
                is_online: true,
                last_seen: new Date().toISOString()
            }, { onConflict: 'phone_number' });

            res.json({ success: true });
        } catch (e) {
            console.error("Erreur Heartbeat:", e.message);
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 2. CHECK-IN PAR SELFIE (VÉRIFICATION MILITAIRE GEMINI)
    // =====================================================
    app.post('/api/checkin', async (req, res) => {
        const { selfieBase64, lat, lng, agentName, agentPhone } = req.body;
        const timestamp = new Date().toISOString();

        try {
            let verificationResult = { valid: true, message: "Check-in manuel validé." };

            if (selfieBase64 && ai) {
                console.log(`📸 Vérification RH par Gemini pour ${agentName}...`);
                const analysis = await analyzeImageWithGemini(
                    selfieBase64,
                    `Tu es l'Inspecteur RH intraitable de Natango. Analyse ce selfie de prise de poste.
Date/Heure : ${new Date().toLocaleString('fr-SN', { timeZone: 'Africa/Dakar' })}

Vérifie STRICTEMENT :
1. Y a-t-il un visage humain clairement visible et net ?
2. La photo semble-t-elle être un vrai selfie pris à l'instant (refuse les photos d'écrans ou photos d'identité) ?
3. L'agent est-il en extérieur ou dans un environnement de travail de terrain cohérent ?

Réponds UNIQUEMENT en JSON strict :
{
  "visage_detecte": true/false,
  "selfie_authentique": true/false,
  "environnement_coherent": true/false,
  "validation": true/false,
  "commentaire": "Explication cinglante et stricte du refus, ou validation courte."
}`
                );

                try {
                    const parsed = JSON.parse(analysis);
                    verificationResult = {
                        valid: parsed.validation,
                        faceDetected: parsed.visage_detecte,
                        authenticSelfie: parsed.selfie_authentique,
                        environmentOk: parsed.environnement_coherent,
                        message: parsed.commentaire
                    };
                } catch (e) {
                    verificationResult = { valid: false, message: "Erreur de format IA. Refusé par sécurité." };
                }
            }

            // Enregistrer l'historique RH dans la base
            try {
                await supabase.from('checkins').insert([{
                    agent_name: agentName || 'Agent',
                    agent_phone: agentPhone || 'N/A',
                    gps_latitude: lat,
                    gps_longitude: lng,
                    timestamp: timestamp,
                    selfie_url: selfieBase64 ? 'selfie_inclus' : null,
                    ai_verification: JSON.stringify(verificationResult),
                    is_valid: verificationResult.valid
                }]);
            } catch (e) { console.warn("Table checkins ignorée (non disponible)."); }

            if (verificationResult.valid) {
                // L'agent est déclaré "En Ligne" pour le Dispatching (Ops)
                await supabase.from('users').upsert({
                    phone_number: agentPhone,
                    name: agentName,
                    role: 'Agent',
                    last_lat: lat,
                    last_lng: lng,
                    is_online: true,
                    last_seen: new Date().toISOString()
                }, { onConflict: 'phone_number' });

                pushEvent('DG', 'rh', `✅ Check-in validé par IA : ${agentName} est sur le terrain à ${new Date().toLocaleTimeString('fr-SN', { timeZone: 'Africa/Dakar' })}.`, 'system');
                res.json({ success: true, message: "Check-in validé par IA.", verification: verificationResult });
            } else {
                // Alerte rouge pour le DG
                pushEvent('DG', 'rh', `⚠️ FRAUDE DÉTECTÉE : Check-in refusé pour ${agentName}. Motif IA : ${verificationResult.message}`, 'system');
                res.json({ success: false, message: "Check-in refusé par l'IA.", verification: verificationResult });
            }
        } catch (error) {
            console.error("Erreur checkin:", error.message);
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 3. STATISTIQUES & GAMIFICATION DE L'AGENT (XP)
    // =====================================================
    app.get('/api/agent-stats/:phone', async (req, res) => {
        try {
            const phone = req.params.phone;
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Dakar' });

            const { data: checkin } = await supabase.from('checkins')
                .select('timestamp, is_valid').eq('agent_phone', phone).gte('timestamp', today)
                .order('timestamp', { ascending: true }).limit(1).single();

            const { data: missions } = await supabase.from('incidents')
                .select('incident_id').eq('assigned_agent_phone', phone).eq('status', 'completed')
                .gte('timestamp_completed', today);

            const missionsCount = missions ? missions.length : 0;
            const xp = 1200 + (missionsCount * 150); // XP de base + 150 par nettoyage

            let status = 'Absent';
            let checkinTime = null;

            if (checkin) {
                const dateObj = new Date(checkin.timestamp);
                checkinTime = dateObj.toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });
                // Règle stricte RH : Avant 9h00 = Présent / Après 9h00 = Retard
                const hourDakar = Number(dateObj.toLocaleString('fr-SN', { hour: '2-digit', timeZone: 'Africa/Dakar' }));
                status = hourDakar < 9 ? 'Présent' : 'Retard';
            }

            res.json({ success: true, stats: { status, checkinTime, missionsCount, xp } });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // 4. LE FLICAGE AUTOMATIQUE (CRON 09:00 DAKAR)
    // =====================================================
    let hrCheckDoneToday = false;

    setInterval(async () => {
        const now = new Date();
        const dakarHour = Number(now.toLocaleString('fr-SN', { hour: '2-digit', timeZone: 'Africa/Dakar' }));
        const dakarMinute = Number(now.toLocaleString('fr-SN', { minute: '2-digit', timeZone: 'Africa/Dakar' }));

        // Si 09:00 tapante à Dakar et que l'audit n'est pas fait
        if (dakarHour === 9 && dakarMinute === 0 && !hrCheckDoneToday) {
            hrCheckDoneToday = true;
            console.log("⏰ 09:00 DAKAR - Lancement de l'audit RH automatique...");

            try {
                const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Dakar' });
                const { data: agents } = await supabase.from('authorized_users').select('phone_number, name').eq('role', 'Agent');
                const { data: checkins } = await supabase.from('checkins').select('agent_phone').gte('timestamp', today);
                
                const checkedInPhones = (checkins || []).map(c => c.agent_phone);

                if (agents) {
                    agents.forEach(agent => {
                        // Si l'agent autorisé n'a pas fait son check-in
                        if (!checkedInPhones.includes(agent.phone_number)) {
                            // Envoi d'une alerte sur le téléphone de l'agent
                            pushEvent('Agent', agent.phone_number, `Il est 9h00. Vous n'avez pas pris votre poste. Confirmez votre statut immédiatement.`, 'hr_attendance_prompt');
                            // Alerte le DG sur le Dashboard
                            pushEvent('DG', 'rh', `🔴 ALERTE ABSENCE : ${agent.name} n'a pas pris son poste à 9h00.`, 'system');
                        }
                    });
                }
            } catch (e) { console.error("Erreur vérification RH:", e.message); }
        }

        // Réinitialisation du système à minuit
        if (dakarHour === 0) hrCheckDoneToday = false; 
    }, 60000); // Check toutes les minutes

    // --- RÉPONSE DE L'AGENT À L'ALERTE DE 9H00 ---
    app.post('/api/hr-attendance', async (req, res) => {
        const { phone, name, isComing, reason } = req.body;
        try {
            if (isComing) {
                pushEvent('DG', 'rh', `⚠️ RETARD SIGNALÉ : ${name} arrivera en retard. Motif : "${reason}".`, 'system');
            } else {
                pushEvent('DG', 'rh', `❌ ABSENCE : ${name} est officiellement absent aujourd'hui. Motif : "${reason}".`, 'system');
                // Force l'agent hors-ligne (le Dispatching Ops l'ignorera pour la journée)
                await supabase.from('users').update({ is_online: false, last_lat: null, last_lng: null }).eq('phone_number', phone);
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false }); }
    });
}