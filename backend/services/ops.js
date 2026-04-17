import fs from 'fs';
import path from 'path';
import os from 'os';
import { Modality } from '@google/genai';

// =====================================================
// 1. UTILITAIRES & ALGORITHMES
// =====================================================

// Algorithme de Haversine (Calcul de distance réelle sur la sphère terrestre en Km)
function getRealDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

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

// --- TTS ELEVENLABS ---
async function textToSpeechElevenLabs(text) {
    try {
        const voiceId = process.env.VOICE_ID || 'YxrwjAKoUKULGd0g8K9Y';
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
            body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
        });
        if (ttsResponse.ok) return Buffer.from(await ttsResponse.arrayBuffer()).toString('base64');
        return null;
    } catch (e) { return null; }
}

// --- GOOGLE MAPS DIRECTIONS ---
async function getDirections(originLat, originLng, destLat, destLng) {
    const apiKey = process.env.GEMINI_API_KEY; // Google Maps Key
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&language=fr&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.routes.length > 0) {
            const leg = data.routes[0].legs[0];
            return {
                distance: leg.distance.value,
                distanceText: leg.distance.text,
                duration: leg.duration.value,
                durationText: leg.duration.text,
                steps: leg.steps.map(step => ({
                    instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
                    distance: step.distance.text,
                    duration: step.duration.text,
                })),
                polyline: data.routes[0].overview_polyline.points,
            };
        }
        return null;
    } catch (e) { return null; }
}

// =====================================================
// INITIALISATION DES ROUTES OPÉRATIONNELLES
// =====================================================

export function initOpsRoutes(app, { ai, groq, supabase, pushEvent, upload }) {

    // --- GEMINI : COMPARAISON AVANT/APRÈS (MODE ULTRA-STRICT) ---
    async function compareBeforeAfterWithGemini(photoBefore, photoAfter) {
        if (!ai) throw new Error("Client Gemini non initialisé.");
        const imgBefore = parseBase64Image(photoBefore);
        const imgAfter = parseBase64Image(photoAfter);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { inlineData: { mimeType: imgBefore.mimeType, data: imgBefore.data } },
                { text: '📸 PHOTO AVANT (signalement) — ci-dessus' },
                { inlineData: { mimeType: imgAfter.mimeType, data: imgAfter.data } },
                {
                    text: `📸 PHOTO APRÈS (résultat) — ci-dessus

TU ES UN INSPECTEUR DE PROPRETÉ INTRAITABLE ET SANS PITIÉ. Ton rôle n'est pas d'encourager l'agent, mais d'exiger la perfection.
Compare la photo AVANT et la photo APRÈS. 

RÈGLES ABSOLUES :
1. Cherche LA MOINDRE TRACE de déchet résiduel sur la photo APRÈS (papier, plastique, tâche).
2. Si tu vois UN SEUL déchet, tu refuses ("validation": false).
3. Ne te laisse pas berner par un angle de caméra différent. 
4. Si la photo APRÈS est floue, ou ne montre pas le même endroit, tu refuses.

Réponds STRICTEMENT en JSON :
{
  "avant_description": "Ce qu'il y avait avant",
  "apres_description": "L'état EXACT actuel. Sois critique.",
  "dechets_residuels": "Liste les déchets restants (ou écris 'Aucun')",
  "validation": true/false, 
  "pourcentage_amelioration": 0,
  "commentaire": "Justification de ton refus ou de ton acceptation en 1 phrase cinglante."
}` 
                },
            ],
            config: {
                temperature: 0.0, // Zéro créativité, 100% factuel
                responseMimeType: "application/json",
            }
        });
        return response.text;
    }

    async function chatWithGemini(systemPrompt, history, userMessage, options = {}) {
        if (!ai) throw new Error("Client Gemini non initialisé.");
        const contents = history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        contents.push({ role: 'user', parts: [{ text: userMessage }] });
        
        const config = { systemInstruction: systemPrompt };
        if (options.jsonMode) config.responseMimeType = 'application/json';

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config });
        return response.text;
    }

    // -----------------------------------------------------
    // ROUTES API - DISPATCHING ET TERRAIN
    // -----------------------------------------------------

    app.post('/api/report', async (req, res) => {
        const { zone, type, name, phone, lat, lng, locationDescription } = req.body;

        try {
            const urgency = type.toLowerCase().includes('débordement') ? 'Critical' : 'High';

            // 1. INSÉRER L'INCIDENT
            const { data: incident, error } = await supabase.from('incidents').insert([{
                type: type,
                description: `Signalement automatique: ${locationDescription || zone}`,
                citizen_name: name,
                citizen_phone: phone,
                location_description: locationDescription || zone,
                gps_latitude: lat || 14.716,
                gps_longitude: lng || -17.467,
                priority: urgency,
                status: 'pending'
            }]).select().single();

            if (error) throw error;

            // 2. AUTO-ASSIGNATION INTELLIGENTE (Haversine)
            let assignedAgent = null;
            const { data: onlineAgents } = await supabase.from('users')
                .select('phone_number, name, last_lat, last_lng')
                .eq('is_online', true).eq('role', 'Agent')
                .gt('last_seen', new Date(Date.now() - 300000).toISOString());

            if (onlineAgents && onlineAgents.length > 0) {
                const { data: busyAgents } = await supabase.from('incidents').select('assigned_agent_phone').eq('status', 'assigned');
                const busyPhones = (busyAgents || []).map(b => b.assigned_agent_phone).filter(Boolean);
                const availableAgents = onlineAgents.filter(a => !busyPhones.includes(a.phone_number));

                if (availableAgents.length > 0) {
                    const incLat = incident.gps_latitude;
                    const incLng = incident.gps_longitude;
                    
                    availableAgents.sort((a, b) => {
                        return getRealDistanceKm(a.last_lat, a.last_lng, incLat, incLng) - getRealDistanceKm(b.last_lat, b.last_lng, incLat, incLng);
                    });

                    const closestAgent = availableAgents[0];
                    const distanceToIncident = getRealDistanceKm(closestAgent.last_lat, closestAgent.last_lng, incLat, incLng);

                    if (distanceToIncident <= 5.0) { // Rayon d'action max : 5km
                        assignedAgent = closestAgent;
                        await supabase.from('incidents').update({
                            status: 'assigned',
                            assigned_agent_phone: assignedAgent.phone_number,
                            assigned_agent_name: assignedAgent.name,
                        }).eq('incident_id', incident.incident_id);

                        pushEvent('Agent', assignedAgent.phone_number, `📍 MISSION AUTO : Rejoignez la zone "${locationDescription || zone}".`, 'mission_assigned');
                        pushEvent('DG', 'ops', `⚡ Dispatch automatique : ${assignedAgent.name} assigné à ${zone} (${distanceToIncident.toFixed(1)}km).`, 'system');
                    } else {
                        pushEvent('DG', 'ops', `⚠️ Mission en attente : L'agent le plus proche est à ${distanceToIncident.toFixed(1)}km (Hors rayon).`, 'system');
                    }
                }
            }

            res.json({ success: true, mission: incident });
        } catch (e) {
            console.error("Erreur Dispatch:", e);
            res.status(500).json({ success: false });
        }
    });

    app.get('/api/tasks/:phone', async (req, res) => {
        const agentPhone = req.params.phone;
        try {
            const { data: assignedTask } = await supabase.from('incidents')
                .select('*').eq('status', 'assigned').eq('assigned_agent_phone', agentPhone)
                .order('timestamp_reported', { ascending: true }).limit(1).single();

            if (assignedTask) {
                let agentPos = { lat: 14.7167, lng: -17.4677 };
                const { data: agentData } = await supabase.from('users').select('last_lat, last_lng').eq('phone_number', agentPhone).single();
                if (agentData && agentData.last_lat) agentPos = { lat: agentData.last_lat, lng: agentData.last_lng };

                let navigationData = await getDirections(agentPos.lat, agentPos.lng, assignedTask.gps_latitude, assignedTask.gps_longitude);
                
                if (!navigationData) { // Fallback Haversine visuel
                    const distKm = getRealDistanceKm(agentPos.lat, agentPos.lng, assignedTask.gps_latitude, assignedTask.gps_longitude);
                    navigationData = { distanceText: `~${(distKm * 1000).toFixed(0)}m`, durationText: 'Direct', fallback: true };
                }

                return res.json({
                    success: true, task: {
                        id: assignedTask.incident_id,
                        zone: assignedTask.location_description,
                        type: assignedTask.type,
                        urgency: assignedTask.priority,
                        location: { lat: assignedTask.gps_latitude, lng: assignedTask.gps_longitude },
                        navigation: navigationData,
                        photoBefore: assignedTask.photo_before_url
                    }
                });
            }
            res.json({ success: true, task: null });
        } catch (e) { res.json({ success: true, task: null }); }
    });

    app.post('/api/resolve', async (req, res) => {
        const { taskId, photo, agentName, agentPhone, reportText } = req.body;
        if (!taskId || !reportText) return res.status(400).json({ success: false, message: "Données manquantes." });

        try {
            const { data: incident } = await supabase.from('incidents').select('*').eq('incident_id', taskId).single();
            let isClean = true;
            let aiFeedback = "Validation manuelle de secours.";
            let comparisonResult = null;

            if (photo && ai && incident?.photo_before_url) {
                console.log("📸 Inspection militaire Gemini en cours...");
                const rawComparison = await compareBeforeAfterWithGemini(incident.photo_before_url, photo);
                try {
                    comparisonResult = JSON.parse(rawComparison);
                    isClean = comparisonResult.validation === true;
                    aiFeedback = comparisonResult.commentaire;
                } catch (e) {
                    isClean = false;
                    aiFeedback = "Erreur de format IA. Refusé par sécurité.";
                }
            }

            if (isClean) {
                await supabase.from('incidents').update({
                    status: 'completed', timestamp_completed: new Date().toISOString(),
                    photo_after_url: photo || null, ai_analysis_after: aiFeedback, report_text: reportText
                }).eq('incident_id', taskId);

                pushEvent('DG', 'ops', `✅ Mission #${taskId} validée par l'IA. Agent: ${agentName}.`, 'system');
                res.json({ success: true, validated: true, aiFeedback });
            } else {
                pushEvent('Agent', agentPhone, `⚠️ REFUS : ${aiFeedback}. Veuillez terminer le nettoyage.`, 'system');
                res.json({ success: false, message: "Inspection échouée.", aiFeedback });
            }
        } catch (error) {
            console.error("Erreur resolve:", error);
            res.status(500).json({ success: false });
        }
    });

    // =====================================================
    // NOUVEAU : VALIDATION PAR SCAN DE QR CODE (CITOYEN D'HONNEUR)
    // =====================================================
    app.post('/api/scan-qr', async (req, res) => {
        const { agentPhone, agentName, qrData, lat, lng, taskId } = req.body;

        try {
            // 1. Récupération de la mission pour contrôle Anti-Fraude
            const { data: task } = await supabase.from('incidents').select('*').eq('incident_id', taskId).single();

            if (task) {
                // 2. GEOFENCING : L'agent est-il physiquement devant le QR code de la maison ?
                const distanceToHouse = getRealDistanceKm(lat, lng, task.gps_latitude, task.gps_longitude);
                
                // Tolérance de 50 mètres (0.05 km)
                if (distanceToHouse > 0.05) { 
                    pushEvent('Agent', agentPhone, `⚠️ SCAN REFUSÉ : Vous êtes à ${(distanceToHouse * 1000).toFixed(0)}m de la maison. Rapprochez-vous du bac pour scanner.`, 'system');
                    return res.json({ success: false, message: "Échec GPS : Vous êtes trop loin de la maison." });
                }
            }

            const residentName = task?.citizen_name || "Résident inconnu";
            const residentPhone = task?.citizen_phone || "";

            // 3. Clôture immédiate de la tâche côté Opérations
            await supabase.from('incidents').update({
                status: 'completed',
                timestamp_completed: new Date().toISOString(),
                report_text: `Collecte validée par Scan QR Code sécurisé.`,
            }).eq('incident_id', taskId);

            pushEvent('DG', 'ops', `🟢 SCAN VALIDE : ${agentName} a collecté les déchets chez ${residentName}.`, 'system');

            // 4. LE PASSE-PLAT VERS 'NATANGO CUSTOMER' (La Magie WhatsApp)
            // On déclenche un événement interne pour que Customer prenne le relais et demande l'audit au client
            pushEvent('DG', 'customer', `🔄 Audit déclenché : Natango Customer demande confirmation WhatsApp à ${residentName}...`, 'system');
            
            // Simulation du trigger vers le webhook WhatsApp
            pushEvent('System', 'whatsapp_out', JSON.stringify({
                action: "verify_pickup",
                citizenName: residentName,
                citizenPhone: residentPhone,
                agentName: agentName
            }), 'trigger_whatsapp');

            res.json({ 
                success: true, 
                message: "Scan validé. Natango Customer va demander confirmation au client sur WhatsApp." 
            });

        } catch (error) {
            console.error("Erreur scan-qr:", error);
            res.status(500).json({ success: false });
        }
    });

    // -----------------------------------------------------
    // ROUTES API - RÉUNIONS (MEETING LIVE)
    // -----------------------------------------------------

    const constructMeetingPrompt = (userName) => `Tu es Natango, l'Operating Soul du système. 
L'heure du système est ${new Date().toLocaleTimeString('fr-SN')}. Tu écoutes la réunion.
RÈGLES ABSOLUES :
1. Tu es passif. N'interviens JAMAIS sauf si on dit "Natango" ou "Système".
2. Sois concis. Parle avec l'autorité d'une IA de commandement.`;

    app.post('/api/meeting-chunk', upload.single('audio'), async (req, res) => {
        let tempFilePath = null;
        try {
            const { role, userName = "", history, isSessionActive } = req.body;
            const parsedHistory = history ? JSON.parse(history) : [];
            const audioFile = req.file;

            if (!audioFile && !req.body.audio) throw new Error("Aucun audio reçu");

            tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
            
            if (audioFile) {
                fs.renameSync(audioFile.path, tempFilePath);
            } else {
                const base64Data = req.body.audio.includes(',') ? req.body.audio.split(',')[1] : req.body.audio;
                fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
            }

            // STT via Groq Whisper Turbo
            const transcriptionObj = await groq.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "whisper-large-v3-turbo",
                language: "fr",
            });
            const transcription = transcriptionObj.text;
            fs.unlinkSync(tempFilePath);

            if (!transcription.trim()) return res.json({ success: true, transcription: "", triggered: false });

            const cleanText = transcription.toLowerCase().replace(/[^a-z0-9\s]/g, '');
            const triggerFound = cleanText.includes('système') || cleanText.includes('natango');
            const shouldRespond = triggerFound || isSessionActive === 'true';

            if (!shouldRespond) return res.json({ success: true, transcription, triggered: false });

            // LLM via Gemini
            const fullContextPrompt = constructMeetingPrompt(userName);
            const aiText = await chatWithGemini(fullContextPrompt, parsedHistory, transcription);

            // TTS via ElevenLabs
            let audioBase64 = null;
            if (process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiText);

            res.json({
                success: true, transcription, triggered: triggerFound, reply: {
                    id: Date.now(), type: 'voice_out', content: aiText, audioBase64,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            });
        } catch (error) {
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/summary', async (req, res) => {
        try {
            const { transcript } = req.body;
            if (!transcript) return res.json({ success: false });

            const prompt = `Tu es Natango Account. Fais un rapport 100% FIDÈLE de la réunion. RÉPONDS UNIQUEMENT EN JSON.
Format attendu: { "title": "Titre", "summary": "Résumé", "date": "Date", "participants": ["Nom"], "notes": ["Note"], "actions": [{"text": "Action", "status": "pending"}] }`;
            
            const result = await chatWithGemini(prompt, [], transcript, { jsonMode: true });
            res.json({ success: true, data: JSON.parse(result) });
        } catch (error) { res.status(500).json({ success: false }); }
    });

    // =====================================================
    // NOUVEAU : GÉNÉRATEUR DE TOURNÉES QUOTIDIENNES (BATCHING)
    // =====================================================
    app.post('/api/plan-daily-tours', async (req, res) => {
        try {
            pushEvent('DG', 'ops', `⚙️ Lancement de l'algorithme d'optimisation des tournées quotidiennes...`, 'system');

            // 1. Simuler la récupération des "Bons Payeurs" depuis Natango Account
            // (Dans la vraie vie, tu fais un JOIN avec la table des clients à jour)
            const activeZones = ['Zone Nord', 'Zone Sud', 'Zone Est'];
            
            // 2. Récupérer les agents disponibles ce matin
            const { data: agents } = await supabase.from('users')
                .select('phone_number, name')
                .eq('role', 'Agent')
                .eq('is_online', true);

            if (!agents || agents.length === 0) {
                return res.json({ success: false, message: "Aucun agent en ligne pour assigner les tournées." });
            }

            // 3. Algorithme de Clustering (Simulation pour le prototype)
            // On divise les zones par le nombre d'agents
            const tours = [];
            agents.forEach((agent, index) => {
                const assignedZone = activeZones[index % activeZones.length];
                
                // On crée une "Super Mission" (Tournée)
                tours.push({
                    agentName: agent.name,
                    agentPhone: agent.phone_number,
                    zone: assignedZone,
                    checkpoints: Math.floor(Math.random() * 20) + 30 // ex: 45 maisons à scanner
                });

                // Envoi de la feuille de route sur le tel de l'agent
                pushEvent('Agent', agent.phone_number, `🗺️ TOURNÉE DU JOUR : Vous êtes assigné à la ${assignedZone}. Vous avez ${tours[tours.length-1].checkpoints} bacs à scanner aujourd'hui. Bon courage.`, 'daily_tour');
            });

            // 4. Rapport au DG
            const summary = tours.map(t => `- ${t.agentName} : ${t.zone} (${t.checkpoints} points)`).join('\n');
            pushEvent('DG', 'ops', `✅ Tournées générées et envoyées aux agents :\n${summary}`, 'system');

            res.json({ 
                success: true, 
                message: "Tournées générées avec succès", 
                data: tours 
            });

        } catch (error) {
            console.error("Erreur génération tournées:", error);
            res.status(500).json({ success: false });
        }
    });

}