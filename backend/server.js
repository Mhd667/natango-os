import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import multer from 'multer';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Modality } from '@google/genai';
import expressWs from 'express-ws';

dotenv.config();

const app = express();
expressWs(app);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ dest: 'uploads/' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- GEMINI AI (Chat, Vision, Image Gen, Live) ---
let ai;
try {
    if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log("✅ Client Gemini initialisé.");
    } else {
        console.warn("⚠️ ATTENTION: GEMINI_API_KEY n'est pas définie dans le fichier .env");
    }
} catch (e) {
    console.error("Erreur initialisation Gemini:", e);
}

// --- GROQ (Whisper STT uniquement) ---
let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        console.log("✅ Client Groq (Whisper STT) initialisé.");
    } else {
        console.warn("⚠️ GROQ_API_KEY manquante (transcription audio désactivée).");
    }
} catch (e) {
    console.error("Erreur initialisation Groq:", e);
}

// --- TRANSCRIPTION AUDIO (Groq Whisper) ---
async function transcribeAudio(filePath) {
    if (!groq) throw new Error("Client Groq non initialisé.");
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            language: "fr",
            response_format: "json",
        });
        return transcription.text || "";
    } catch (error) {
        throw new Error(`Erreur Transcription Groq: ${error.message}`);
    }
}

// --- UTILITAIRE : EXTRAIRE BASE64 ---
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

// --- GEMINI : ANALYSE D'UNE IMAGE ---
async function analyzeImageWithGemini(base64Image, prompt) {
    if (!ai) throw new Error("Client Gemini non initialisé.");
    const img = parseBase64Image(base64Image);
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
            { inlineData: { mimeType: img.mimeType, data: img.data } },
            { text: prompt }
        ],
    });
    return response.text;
}

// --- GEMINI : COMPARAISON AVANT/APRÈS (2 IMAGES) ---
async function compareBeforeAfterWithGemini(photoBefore, photoAfter, contextInfo) {
    if (!ai) throw new Error("Client Gemini non initialisé.");
    const imgBefore = parseBase64Image(photoBefore);
    const imgAfter = parseBase64Image(photoAfter);

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
            { inlineData: { mimeType: imgBefore.mimeType, data: imgBefore.data } },
            { text: '📸 PHOTO AVANT (signalement citoyen) — ci-dessus' },
            { inlineData: { mimeType: imgAfter.mimeType, data: imgAfter.data } },
            {
                text: `📸 PHOTO APRÈS (prise par l'agent après nettoyage) — ci-dessus

Tu es un expert IA en propreté urbaine. Compare ces deux photos.
Date/Heure : ${contextInfo.dateTime}
Type d'incident : ${contextInfo.incidentType || 'N/A'}

Analyse comparative :
1. Décris ce que tu vois dans la photo AVANT
2. Décris ce que tu vois dans la photo APRÈS
3. L'intervention a-t-elle réellement amélioré la situation ?
4. La zone est-elle maintenant propre ?

Réponds en JSON strict :
{
  "avant_description": "Ce que tu vois sur la photo avant",
  "apres_description": "Ce que tu vois sur la photo après",
  "amelioration_constatee": true/false,
  "zone_propre": true/false,
  "pourcentage_amelioration": 0-100,
  "dechets_residuels": "Description si des déchets restent",
  "validation": true/false,
  "commentaire": "Synthèse courte de la comparaison"
}` },
        ],
    });
    return response.text;
}


// --- GEMINI : CHAT TEXT ---
async function chatWithGemini(systemPrompt, history, userMessage, options = {}) {
    if (!ai) throw new Error("Client Gemini non initialisé.");

    const contents = [];

    // Ajouter l'historique
    for (const msg of history) {
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    }

    // Ajouter le message utilisateur
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    const config = {
        systemInstruction: systemPrompt,
    };

    if (options.jsonMode) {
        config.responseMimeType = 'application/json';
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config,
    });
    return response.text;
}

// --- ELEVENLABS TTS ---
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
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&language=fr&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes.length > 0) {
            const route = data.routes[0];
            const leg = route.legs[0];
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
                polyline: route.overview_polyline.points,
            };
        }
        return null;
    } catch (e) {
        console.error("Erreur Google Maps Directions:", e.message);
        return null;
    }
}

// --- FILE D'ÉVÉNEMENTS EN MÉMOIRE (POUR LE TEMPS RÉEL UI) ---
let systemEvents = [];
function pushEvent(targetRole, chatId, content, type = 'system', additionalProps = {}) {
    systemEvents.push({
        id: Date.now() + Math.random(),
        targetRole,
        chatId,
        acked: [],
        messageObj: {
            id: Date.now() + Math.random(),
            type,
            content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...additionalProps
        }
    });
    // Mise à jour instantanée du dashboard temps réel
    if (typeof broadcastDashboardUpdate === 'function') {
        broadcastDashboardUpdate().catch(() => { });
    }
}

// =====================================================
// AUTHENTIFICATION (LISTE BLANCHE SUPABASE)
// =====================================================
app.post('/api/auth/login', async (req, res) => {
    const { phone, pin } = req.body; // 👈 On enlève le rôle ici
    
    try {
        // Le serveur cherche juste le numéro et le code
        const { data: user, error } = await supabase
            .from('authorized_users')
            .select('*')
            .eq('phone_number', phone)
            .eq('pin_code', pin)
            .single();

        if (user) {
            // Accès autorisé : Le serveur renvoie le rôle exact trouvé dans la base !
            res.json({ success: true, user: { name: user.name, phone: user.phone_number, role: user.role } });
        } else {
            res.json({ success: false, message: "Accès refusé. Numéro non autorisé ou code incorrect." });
        }
    } catch (e) {
        console.error("Erreur de connexion:", e.message);
        res.status(500).json({ success: false, message: "Erreur lors de la vérification des accès." });
    }
});

// =====================================================
// COMMUNICATION INTER-APP & DÉPLOIEMENT
// =====================================================

app.get('/api/events/:role/:phone', (req, res) => {
    const { role, phone } = req.params;
    const pending = systemEvents.filter(e => (e.targetRole === role || e.targetRole === 'All') && !e.acked.includes(phone));
    pending.forEach(e => e.acked.push(phone));
    res.json({ success: true, events: pending });
});

app.post('/api/report', async (req, res) => {
    const { zone, type, name, phone, lat, lng, photoBase64, locationDescription } = req.body;

    try {
        // --- ANALYSE IA DE LA PHOTO DE SIGNALEMENT (AVANT) ---
        let aiAnalysis = null;
        let urgency = type.toLowerCase().includes('débordement') ? 'Critical' : 'High';

        if (photoBase64 && ai) {
            try {
                aiAnalysis = await analyzeImageWithGemini(
                    photoBase64,
                    `Tu es un expert en gestion des déchets urbains. Analyse cette photo de signalement citoyen.
Date/Heure : ${new Date().toLocaleString('fr-FR')}
Position GPS : ${lat || 'N/A'}, ${lng || 'N/A'}
Type signalé : ${type}

Réponds en JSON strict :
{
  "description_ia": "Description de ce que tu vois",
  "gravite": "Critique|Haute|Moyenne|Basse",
  "type_dechet": "Type de déchet détecté",
  "estimation_volume": "Estimation du volume",
  "recommandation": "Action recommandée pour l'agent"
}`
                );
                try {
                    const parsed = JSON.parse(aiAnalysis);
                    if (parsed.gravite === 'Critique') urgency = 'Critical';
                    else if (parsed.gravite === 'Haute') urgency = 'High';
                    else if (parsed.gravite === 'Moyenne') urgency = 'Medium';
                    else urgency = 'Low';
                } catch (e) { }
            } catch (e) {
                console.error("Erreur analyse photo signalement:", e.message);
            }
        }

        // --- INSÉRER L'INCIDENT AVEC TOUTES LES INFOS CITOYEN ---
        const { data: incident, error } = await supabase
            .from('incidents')
            .insert([{
                type: type,
                description: `Citoyen: ${name} (${phone}) - Signalement: ${locationDescription || zone}`,
                citizen_name: name,
                citizen_phone: phone,
                location_description: locationDescription || zone,
                gps_latitude: lat || 14.716,
                gps_longitude: lng || -17.467,
                priority: urgency,
                photo_before_url: photoBase64 || null,
                ai_analysis_before: aiAnalysis,
                status: 'pending'
            }])
            .select().single();

        if (error) throw error;

        // --- AUTO-ASSIGNATION : TROUVER L'AGENT LE PLUS PROCHE ET DISPONIBLE ---
        let assignedAgent = null;
        try {
            // Agents en ligne depuis < 5 min
            const { data: onlineAgents } = await supabase
                .from('users')
                .select('phone_number, name, last_lat, last_lng')
                .eq('is_online', true)
                .eq('role', 'Agent')
                .gt('last_seen', new Date(Date.now() - 300000).toISOString());

            if (onlineAgents && onlineAgents.length > 0) {
                // Exclure les agents qui ont déjà une mission en cours
                const { data: busyAgents } = await supabase
                    .from('incidents')
                    .select('assigned_agent_phone')
                    .eq('status', 'assigned');

                const busyPhones = (busyAgents || []).map(b => b.assigned_agent_phone).filter(Boolean);
                const availableAgents = onlineAgents.filter(a => !busyPhones.includes(a.phone_number));

                if (availableAgents.length > 0) {
                    // Trier par distance (Haversine simplifié)
                    const incLat = incident.gps_latitude;
                    const incLng = incident.gps_longitude;
                    availableAgents.sort((a, b) => {
                        const distA = Math.sqrt(Math.pow(a.last_lat - incLat, 2) + Math.pow(a.last_lng - incLng, 2));
                        const distB = Math.sqrt(Math.pow(b.last_lat - incLat, 2) + Math.pow(b.last_lng - incLng, 2));
                        return distA - distB;
                    });

                    assignedAgent = availableAgents[0];

                    // Assigner la mission
                    await supabase.from('incidents').update({
                        status: 'assigned',
                        assigned_agent_phone: assignedAgent.phone_number,
                        assigned_agent_name: assignedAgent.name,
                    }).eq('incident_id', incident.incident_id);

                    // Notifier l'agent assigné
                    pushEvent('Agent', assignedAgent.phone_number, `📍 NOUVELLE MISSION : ${type} signalé par ${name} à "${locationDescription || zone}". Rendez-vous aux coordonnées GPS.`, 'mission_assigned', { incidentId: incident.incident_id });

                    // --- ⏰ RÈGLE DES 3 MINUTES (ESCALADE) ---
                    setTimeout(async () => {
                        try {
                            // On vérifie si la mission est toujours bloquée sur "assigned"
                            const { data: checkInc } = await supabase.from('incidents').select('status').eq('incident_id', incident.incident_id).single();

                            if (checkInc && checkInc.status === 'assigned') {
                                // 🚨 ÉTAPE 1 : Déclencher l'appel d'urgence style WhatsApp sur le tel de l'agent
                                pushEvent('Agent', assignedAgent.phone_number, `URGENCE : Mission #${incident.incident_id} en attente !`, 'incoming_call', { incidentId: incident.incident_id });
                                console.log(`[ESCALADE] Appel envoyé à ${assignedAgent.name}`);

                                // 🚨 ÉTAPE 2 : On lui donne 45 secondes pour décrocher. Sinon, on réassigne.
                                setTimeout(async () => {
                                    const { data: reCheck } = await supabase.from('incidents').select('status').eq('incident_id', incident.incident_id).single();
                                    if (reCheck && reCheck.status === 'assigned') {
                                        // Libérer l'agent actuel et chercher le plan B
                                        await supabase.from('incidents').update({ status: 'pending', assigned_agent_phone: null, assigned_agent_name: null }).eq('incident_id', incident.incident_id);
                                        pushEvent('DG', 'terrain', `⚠️ Escalade : ${assignedAgent.name} n'a pas répondu à l'appel. La mission est réassignée au prochain disponible.`, 'system');
                                        // Natango repassera la mission au prochain agent dispo au prochain battement.
                                    }
                                }, 45000); // 45 secondes pour décrocher
                            }
                        } catch (e) { console.error("Erreur escalade:", e.message); }
                    }, 180000); // 180000 ms = 3 minutes exactes
                }
            }
        } catch (e) {
            console.error("Erreur auto-assignation:", e.message);
        }

        const newTask = {
            id: incident.incident_id,
            zone: locationDescription || zone,
            type: type,
            urgency: urgency,
            citizenName: name,
            citizenPhone: phone,
            location: { lat: incident.gps_latitude, lng: incident.gps_longitude },
            status: assignedAgent ? 'assigned' : 'pending',
            assignedTo: assignedAgent ? assignedAgent.name : null,
            timestamp: incident.timestamp_reported,
            aiAnalysis: aiAnalysis
        };

        const agentInfo = assignedAgent ? ` → Assigné à ${assignedAgent.name}` : ' → En attente d\'agent disponible';
        pushEvent('DG', 'terrain', `🚨 Signalement (${name} - ${phone}) : ${type} à "${locationDescription || zone}". Gravité ${urgency}${agentInfo}.`, 'system');
        res.json({ success: true, mission: newTask });
    } catch (e) {
        console.error("Erreur Report Supabase:", e);
        res.status(500).json({ success: false });
    }
});

// POLLING : L'agent vérifie s'il a une mission assignée à LUI
app.get('/api/tasks/:phone', async (req, res) => {
    const agentPhone = req.params.phone;
    try {
        // Chercher une mission assignée à CET agent
        const { data: assignedTask } = await supabase
            .from('incidents')
            .select('*')
            .eq('status', 'assigned')
            .eq('assigned_agent_phone', agentPhone)
            .order('timestamp_reported', { ascending: true })
            .limit(1)
            .single();

        if (assignedTask) {
            // Récupérer la position réelle de l'agent depuis la table users
            let agentPos = { lat: 14.7167, lng: -17.4677 };
            try {
                const { data: agentData } = await supabase
                    .from('users')
                    .select('last_lat, last_lng')
                    .eq('phone_number', agentPhone)
                    .single();
                if (agentData && agentData.last_lat) {
                    agentPos = { lat: agentData.last_lat, lng: agentData.last_lng };
                }
            } catch (e) { }

            // --- GOOGLE MAPS DIRECTIONS API ---
            let navigationData = null;
            try {
                navigationData = await getDirections(
                    agentPos.lat, agentPos.lng,
                    assignedTask.gps_latitude, assignedTask.gps_longitude
                );
            } catch (e) {
                console.error("Erreur Google Maps:", e.message);
            }

            // Fallback si Google Maps échoue
            if (!navigationData) {
                const dx = assignedTask.gps_longitude - agentPos.lng;
                const dy = assignedTask.gps_latitude - agentPos.lat;
                const distanceMeters = Math.round(Math.sqrt(dx * dx + dy * dy) * 111320);
                navigationData = {
                    distance: distanceMeters || 120,
                    distanceText: `~${distanceMeters || 120}m`,
                    duration: null,
                    durationText: 'Indisponible',
                    steps: [],
                    polyline: null,
                    fallback: true
                };
            }

            const frontendTask = {
                id: assignedTask.incident_id,
                zone: assignedTask.location_description || 'Détectée',
                type: assignedTask.type,
                urgency: assignedTask.priority,
                citizenName: assignedTask.citizen_name || 'Citoyen',
                citizenPhone: assignedTask.citizen_phone || 'N/A',
                location: { lat: assignedTask.gps_latitude, lng: assignedTask.gps_longitude },
                agentPhone: agentPhone,
                navigation: navigationData,
                aiAnalysisBefore: assignedTask.ai_analysis_before || null,
            };
            return res.json({ success: true, task: frontendTask });
        }
        res.json({ success: true, task: null });
    } catch (e) {
        res.json({ success: true, task: null });
    }
});

// DG / NATANGO : Assigner manuellement une mission à un agent spécifique
app.post('/api/assign-mission', async (req, res) => {
    const { incidentId, agentPhone, agentName } = req.body;
    try {
        await supabase.from('incidents').update({
            status: 'assigned',
            assigned_agent_phone: agentPhone,
            assigned_agent_name: agentName || 'Agent',
        }).eq('incident_id', incidentId);

        const { data: incident } = await supabase
            .from('incidents')
            .select('type, location_description, citizen_name')
            .eq('incident_id', incidentId)
            .single();

        pushEvent('Agent', agentPhone, `📍 MISSION ASSIGNÉE PAR LE DG : ${incident?.type || 'Intervention'} à "${incident?.location_description || 'Position GPS'}". Signalé par ${incident?.citizen_name || 'Citoyen'}.`, 'mission_assigned', { incidentId });
        pushEvent('DG', 'terrain', `✅ Mission #${incidentId} assignée à ${agentName || agentPhone}.`, 'system');

        res.json({ success: true });
    } catch (e) {
        console.error("Erreur assign-mission:", e.message);
        res.status(500).json({ success: false });
    }
});

// =====================================================
// REFUS DE MISSION AVEC JUSTIFICATION
// =====================================================
app.post('/api/decline-mission', async (req, res) => {
    const { incidentId, agentPhone, agentName, reason } = req.body;

    try {
        // 1. Remettre la mission dans le pool public (pending) pour le prochain agent dispo
        await supabase.from('incidents').update({
            status: 'pending',
            assigned_agent_phone: null,
            assigned_agent_name: null
        }).eq('incident_id', incidentId);

        // 2. Alerter immédiatement la direction avec le motif exact
        pushEvent('DG', 'terrain', `⚠️ REFUS : ${agentName || 'Un agent'} a décliné la mission #${incidentId}. Motif : "${reason}". La mission est en cours de réassignation automatique.`, 'system');

        res.json({ success: true });
    } catch (e) {
        console.error("Erreur decline-mission:", e.message);
        res.status(500).json({ success: false });
    }
});

app.post('/api/resolve', async (req, res) => {
    const { taskId, photo, agentName, agentPhone, reportText } = req.body;

    if (!taskId) return res.status(404).json({ success: false });

    // Compte rendu obligatoire
    if (!reportText || reportText.trim().length < 5) {
        return res.status(400).json({ success: false, message: "Compte rendu obligatoire. Décrivez votre intervention." });
    }

    try {
        // --- RÉCUPÉRER L'INCIDENT ET SA PHOTO AVANT ---
        const { data: incident } = await supabase
            .from('incidents')
            .select('*')
            .eq('incident_id', taskId)
            .single();

        let aiFeedback = "Validation manuelle de secours.";
        let isClean = true;
        let comparisonResult = null;

        if (photo && ai) {
            const photoBefore = incident?.photo_before_url;

            if (photoBefore && photoBefore !== 'photo_incluse' && photoBefore.length > 100) {
                // ✅ COMPARAISON AVANT/APRÈS avec les 2 images
                console.log("📸 Comparaison Gemini AVANT/APRÈS en cours...");
                const rawComparison = await compareBeforeAfterWithGemini(
                    photoBefore, photo,
                    {
                        dateTime: new Date().toLocaleString('fr-FR'),
                        incidentType: incident?.type || 'N/A',
                    }
                );
                aiFeedback = rawComparison || "Analyse impossible.";
                try {
                    comparisonResult = JSON.parse(rawComparison);
                    isClean = comparisonResult.validation === true;
                    aiFeedback = comparisonResult.commentaire || rawComparison;
                } catch (e) {
                    isClean = rawComparison.toLowerCase().includes("oui") ||
                        rawComparison.toLowerCase().includes("true") ||
                        rawComparison.toLowerCase().includes("propre");
                }
            } else {
                // ⚠️ Pas de photo avant — analyse simple de la photo après
                console.log("📸 Analyse Gemini photo APRÈS uniquement (pas de photo avant).");
                const analysis = await analyzeImageWithGemini(
                    photo,
                    `Tu es un expert en propreté urbaine.
Date/Heure de validation : ${new Date().toLocaleString('fr-FR')}

Est-ce que cette zone est propre et débarrassée de déchets ?
Réponds par OUI ou NON, suivi d'une courte explication (2-3 phrases max).`
                );
                aiFeedback = analysis || "Analyse impossible.";
                isClean = aiFeedback.toLowerCase().includes("oui");
            }
        }

        if (isClean) {
            // Mettre à jour l'incident avec le compte rendu + photo après
            await supabase.from('incidents').update({
                status: 'completed',
                timestamp_completed: new Date().toISOString(),
                photo_after_url: photo || null,
                ai_analysis_after: aiFeedback,
                ai_comparison: comparisonResult ? JSON.stringify(comparisonResult) : null,
                report_text: reportText,
            }).eq('incident_id', taskId);

            const pctText = comparisonResult?.pourcentage_amelioration
                ? ` (Amélioration: ${comparisonResult.pourcentage_amelioration}%)`
                : '';
            const citizenInfo = incident?.citizen_name ? ` | Citoyen: ${incident.citizen_name}` : '';
            pushEvent('DG', 'terrain', `✅ MISSION CLÔTURÉE${pctText} par ${agentName || 'Agent'}${citizenInfo}.\n📝 Compte rendu: "${reportText}"\n🤖 IA: "${aiFeedback}"`, 'system');
            res.json({ success: true, validated: true, aiFeedback, comparison: comparisonResult });
        } else {
            const reason = comparisonResult?.dechets_residuels || aiFeedback;
            pushEvent('Agent', agentPhone || 'terrain', `⚠️ REFUS GEMINI : La zone n'est pas propre. IA : "${reason}". Continuez le nettoyage.`, 'system');
            res.json({ success: false, message: "L'IA Gemini a refusé la validation après comparaison avant/après.", aiFeedback, comparison: comparisonResult });
        }
    } catch (error) {
        console.error("Erreur resolve:", error.message);
        await supabase.from('incidents').update({
            status: 'completed',
            report_text: reportText,
        }).eq('incident_id', taskId);
        pushEvent('DG', 'terrain', `✅ ${agentName || 'Agent'} a clôturé la mission.\n📝 Compte rendu: "${reportText}"`, 'system');
        res.json({ success: true, validated: true });
    }
});

app.post('/api/agent-issue', (req, res) => {
    const { name, issue } = req.body;
    pushEvent('DG', 'terrain', `L'agent ${name} signale : "${issue}".\n💡 Proposition IA : Réallouer 50 sacs depuis la Zone Nord vers sa position.`, 'dg_action', { issueId: Date.now() });
    res.json({ success: true });
});

app.post('/api/dg-action', (req, res) => {
    pushEvent('Agent', 'terrain', `✅ Le Superviseur a validé la correction logistique. Le réapprovisionnement est en route vers votre position.`, 'system');
    res.json({ success: true });
});

// =====================================================
// NOUVEAU : ROUTE HEARTBEAT (Tracking GPS en direct)
// =====================================================
app.post('/api/heartbeat', async (req, res) => {
    const { phone, lat, lng, name } = req.body;
    try {
        // Met à jour la position de l'agent et marque comme en ligne
        await supabase.from('users')
            .upsert({
                phone_number: phone,
                name: name,
                role: 'Agent',
                last_lat: lat,
                last_lng: lng,
                is_online: true,
                last_seen: new Date()
            }, { onConflict: 'phone_number' });

        res.json({ success: true });
    } catch (e) {
        console.error("Erreur Heartbeat:", e.message);
        res.status(500).json({ success: false });
    }
});

// =====================================================
// IA CHAT & VOICE PIPELINE (GEMINI)
// =====================================================

async function buildDynamicContext(role, targetAi) {
    const timeStr = new Date().toLocaleTimeString('fr-FR');
    const dateStr = new Date().toLocaleDateString('fr-FR');

    // 1. Récupérer les agents réellement en ligne avec leur dernière position et heure
    const { data: onlineAgents } = await supabase
        .from('users')
        .select('name, last_lat, last_lng, last_seen')
        .eq('is_online', true)
        .gt('last_seen', new Date(Date.now() - 300000).toISOString()); // Actifs il y a < 5 min

    // 2. Récupérer les incidents ouverts avec la vraie description et le citoyen
    const { data: openIncidents } = await supabase
        .from('incidents')
        .select('type, priority, description, citizen_name, timestamp_reported, location_description')
        .eq('status', 'pending');

    const agentsStr = onlineAgents?.map(a => `- ${a.name} (GPS: ${a.last_lat.toFixed(4)}, ${a.last_lng.toFixed(4)} | Check: ${new Date(a.last_seen).toLocaleTimeString('fr-FR')})`).join('\n') || "Aucun agent actif sur le terrain.";
    const incidentsStr = openIncidents?.map(i => `- [${i.priority}] ${i.type} à "${i.location_description}" (Signalé par ${i.citizen_name})`).join('\n') || "Aucun incident en attente.";

    let prompt = `Tu es Natango OS. ATTENTION : CECI N'EST PAS UNE SIMULATION. TU ES EN PRODUCTION RÉELLE SUR LE TERRAIN.
DATE DU JOUR : ${dateStr}
HEURE SYSTÈME EXACTE : ${timeStr}

--- ÉTAT STRICT DU TERRAIN (BASE DE DONNÉES EN DIRECT) ---
AGENTS OPÉRATIONNELS (Positions GPS réelles) :
${agentsStr}

INCIDENTS RÉELS À TRAITER :
${incidentsStr}

--- CONSIGNES ABSOLUES ---
1. N'INVENTE JAMAIS d'agents, de lieux, ou d'incidents. Base-toi UNIQUEMENT sur les données ci-dessus.
2. Si un agent te parle, regarde ses coordonnées GPS et guide-le vers l'incident réel le plus proche.
3. Sois ultra-direct, concret et professionnel. Pas de phrases robotiques, donne les infos terrain. (2 phrases max).`;

    if (targetAi === 'marketing') {
        const pendingCount = openIncidents?.length || 0;
        const { count: cCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const completedCount = cCount || 0;
        return `Tu es Natango Marketing. Réponds UNIQUEMENT avec un objet JSON valide pour une infographie.
{
  "title": "Bilan Opérationnel Terrain",
  "event_date": "${dateStr}",
  "metrics": [
    {"label": "Signalements Actifs", "value": "${pendingCount}", "trend": "Aujourd'hui"},
    {"label": "Incidents Résolus", "value": "${completedCount}", "trend": "En cours"}
  ]
}`;
    }
    return prompt;
}

const constructMeetingPrompt = (userName) => {
    const timeStr = new Date().toLocaleTimeString();
    return `Tu es l'Intelligence Artificielle qui participe vocalement à cette réunion de direction. 
Tu parles à l'équipe. L'heure du système est ${timeStr}.

RÈGLES DE COMPORTEMENT :
1. Analyse l'historique de la réunion fourni et RÉPONDS UNIQUEMENT À LA QUESTION POSÉE par l'utilisateur.
2. Si on te demande "t'en penses quoi ?", donne un avis pertinent basé sur ce qui vient d'être dit.
3. Fais des phrases courtes et naturelles pour l'oral (1 ou 2 phrases maximum).`;
};

app.post('/api/chat', async (req, res) => {
    try {
        const { userId, role, targetAi, message, history = [], needVoiceResponse } = req.body;
        if (!ai) return res.status(500).json({ success: false, error: "Clé API Gemini manquante." });

        const systemPrompt = await buildDynamicContext(role, targetAi);
        const isMarketing = targetAi === 'marketing';

        const aiResponseText = await chatWithGemini(systemPrompt, history, message, { jsonMode: isMarketing });

        if (isMarketing) {
            return res.json({
                success: true, reply: {
                    id: Date.now(), type: 'infographic',
                    content: JSON.parse(aiResponseText),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            });
        }

        let audioBase64 = null;
        if (needVoiceResponse && process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiResponseText);

        res.json({
            success: true, reply: {
                id: Date.now(),
                type: needVoiceResponse ? 'voice_out' : 'text_out',
                content: aiResponseText,
                audioBase64,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        });
    } catch (error) {
        console.error("Erreur /api/chat:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/voice', upload.single('audio'), async (req, res) => {
    let actualFilePath = null;
    try {
        const { role, targetAi, history } = req.body;
        const parsedHistory = history ? JSON.parse(history) : [];
        const audioFile = req.file;
        if (!audioFile) return res.status(400).json({ success: false, error: "Aucun fichier." });

        const ext = audioFile.originalname.includes('.') ? audioFile.originalname.split('.').pop() : 'webm';
        actualFilePath = `${audioFile.path}.${ext}`;
        fs.renameSync(audioFile.path, actualFilePath);

        // STT via Groq Whisper
        const userText = await transcribeAudio(actualFilePath);
        if (!userText.trim()) throw new Error("Audio silencieux.");

        // LLM via Gemini
        const systemPrompt = await buildDynamicContext(role, targetAi);
        const aiResponseText = await chatWithGemini(systemPrompt, parsedHistory, userText);

        // TTS via ElevenLabs
        let audioBase64 = null;
        if (process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiResponseText);
        if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);

        res.json({
            success: true, transcription: userText, reply: {
                id: Date.now(), type: 'voice_out', content: aiResponseText, audioBase64,
                duration: '...', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        });
    } catch (error) {
        if (actualFilePath && fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
        res.status(500).json({ success: false });
    }
});

// =====================================================
// MODE RÉUNION : GEMINI LIVE API (WebSocket temps réel)
// =====================================================

app.ws('/api/meeting-live', (ws, req) => {
    let geminiSession = null;
    let meetingTranscript = [];
    let userName = '';

    ws.on('message', async (msg) => {
        try {
            const data = JSON.parse(msg);

            // --- INITIALISATION DE SESSION ---
            if (data.type === 'session_start') {
                userName = data.userName || 'Participant';

                const meetingSystemPrompt = constructMeetingPrompt(userName);

                geminiSession = await ai.live.connect({
                    model: 'gemini-2.0-flash-live-001',
                    config: {
                        responseModalities: [Modality.AUDIO, Modality.TEXT],
                        systemInstruction: {
                            parts: [{ text: meetingSystemPrompt }]
                        },
                        speechConfig: {
                            languageCode: 'fr-FR',
                        }
                    },
                    callbacks: {
                        onopen: () => {
                            ws.send(JSON.stringify({ type: 'session_ready', message: 'Session Gemini Live connectée.' }));
                        },
                        onmessage: (message) => {
                            // Réponse de Gemini Live
                            const content = message.serverContent;
                            if (content?.modelTurn?.parts) {
                                for (const part of content.modelTurn.parts) {
                                    if (part.inlineData) {
                                        // Audio de réponse
                                        ws.send(JSON.stringify({
                                            type: 'ai_audio',
                                            audio: part.inlineData.data,
                                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                                        }));
                                    }
                                    if (part.text) {
                                        // Texte de réponse (transcription)
                                        meetingTranscript.push({ speaker: 'Natango IA', text: part.text, time: new Date().toISOString() });
                                        ws.send(JSON.stringify({
                                            type: 'ai_text',
                                            text: part.text,
                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        }));
                                    }
                                }
                            }
                            // Fin de tour
                            if (content?.turnComplete) {
                                ws.send(JSON.stringify({ type: 'turn_complete' }));
                            }
                        },
                        onerror: (e) => {
                            console.error("Erreur Gemini Live:", e.message);
                            ws.send(JSON.stringify({ type: 'error', message: e.message }));
                        },
                        onclose: (e) => {
                            ws.send(JSON.stringify({ type: 'session_closed', reason: e?.reason || 'Session terminée.' }));
                        },
                    }
                });
                return;
            }

            // --- ENVOI D'AUDIO EN TEMPS RÉEL ---
            if (data.type === 'audio_chunk' && geminiSession) {
                geminiSession.sendRealtimeInput({
                    audio: {
                        data: data.audio, // base64 encoded PCM
                        mimeType: 'audio/pcm;rate=16000',
                    }
                });
                return;
            }

            // --- ENVOI DE TEXTE ---
            if (data.type === 'text_message' && geminiSession) {
                const text = data.text;
                meetingTranscript.push({ speaker: userName, text, time: new Date().toISOString() });
                geminiSession.sendRealtimeInput({ text });
                return;
            }

            // --- FIN DE SESSION ---
            if (data.type === 'session_end') {
                if (geminiSession) {
                    geminiSession.close();
                    geminiSession = null;
                }
                // Générer un résumé et SAUVEGARDER dans Supabase
                if (meetingTranscript.length > 0 && ai) {
                    const fullTranscript = meetingTranscript.map(t => `[${t.speaker}] ${t.text}`).join('\n');
                    let summaryData = { title: 'Réunion', summary: 'Résumé non disponible.', notes: [], actions: [] };
                    try {
                        const summaryText = await chatWithGemini(
                            `Tu es un assistant de direction. Fais un rapport 100% FIDÈLE de la réunion. RÉPONDS UNIQUEMENT AVEC JSON.`,
                            [],
                            `Voici la transcription de la réunion :\n${fullTranscript}\n\nGénère : { "title": "Titre", "summary": "Résumé", "date": "Date", "duree": "Durée estimée", "participants": ["Nom"], "notes": ["Note 1"], "actions": [{"description": "Action", "responsable": "Nom", "deadline": "Date"}], "decisions": ["Décision 1"] }`,
                            { jsonMode: true }
                        );
                        summaryData = JSON.parse(summaryText);
                    } catch (e) {
                        console.error("Erreur génération résumé:", e.message);
                    }

                    // Sauvegarder dans Supabase
                    try {
                        await supabase.from('meetings').insert([{
                            title: summaryData.title || 'Réunion sans titre',
                            summary: JSON.stringify(summaryData),
                            transcript: fullTranscript,
                            participants: JSON.stringify(summaryData.participants || [userName]),
                            actions: JSON.stringify(summaryData.actions || []),
                            decisions: JSON.stringify(summaryData.decisions || []),
                            notes: JSON.stringify(summaryData.notes || []),
                            created_by: userName,
                            created_at: new Date().toISOString(),
                        }]);
                        console.log("📝 Notes de réunion sauvegardées dans Supabase.");
                    } catch (e) {
                        console.warn("Table 'meetings' non disponible, notes non persistées.", e.message);
                    }

                    ws.send(JSON.stringify({ type: 'meeting_summary', data: summaryData }));
                    pushEvent('DG', 'reunions', `📝 Réunion terminée : "${summaryData.title}". ${(summaryData.actions || []).length} actions, ${(summaryData.decisions || []).length} décisions.`, 'system');
                }
                meetingTranscript = [];
                return;
            }

        } catch (error) {
            console.error("Erreur WebSocket meeting-live:", error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    ws.on('close', () => {
        if (geminiSession) {
            geminiSession.close();
            geminiSession = null;
        }
        meetingTranscript = [];
    });
});

// --- ENDPOINT MEETING CHUNK (FALLBACK non-live) ---
app.post('/api/meeting-chunk', upload.single('audio'), async (req, res) => {
    let actualFilePath = null;
    try {
        const { role, userName = "", history, meetingContext = "", isSessionActive } = req.body;
        const parsedHistory = history ? JSON.parse(history) : [];
        const audioFile = req.file;
        if (!audioFile) return res.status(400).json({ success: false });

        const ext = (audioFile.originalname || '').split('.').pop() || 'webm';
        actualFilePath = `${audioFile.path}.${ext}`;
        fs.renameSync(audioFile.path, actualFilePath);

        // STT via Groq Whisper
        const transcription = await transcribeAudio(actualFilePath);
        if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
        if (!transcription || !transcription.trim()) return res.json({ success: true, transcription: "", triggered: false });

        const cleanText = transcription.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const triggerFound = cleanText.includes('assistant') || cleanText.includes('système') || cleanText.includes('natango') || cleanText.includes('natangu');
        const shouldRespond = triggerFound || isSessionActive === 'true';

        if (!shouldRespond) return res.json({ success: true, transcription, triggered: false });

        // LLM via Gemini
        const fullContextPrompt = `${constructMeetingPrompt(userName)}\n--- HISTORIQUE ---\n"${meetingContext}"\n--- QUESTION ---\n"${transcription}"`;
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
        if (actualFilePath && fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
        res.status(500).json({ success: false });
    }
});

app.post('/api/summary', async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript || transcript.trim() === "") return res.json({ success: false });

        const prompt = `Tu es un assistant de direction. Fais un rapport 100% FIDÈLE. RÉPONDS UNIQUEMENT AVEC JSON.\n{ "title": "Titre", "summary": "Résumé", "notes": ["Note 1"], "actions": ["Action 1"] }\nTexte : "${transcript}"`;
        const result = await chatWithGemini(prompt, [], transcript, { jsonMode: true });

        res.json({ success: true, data: JSON.parse(result) });
    } catch (error) {
        console.error("Erreur /api/summary:", error.message);
        res.status(500).json({ success: false });
    }
});

// =====================================================
// MODULE RH : CHECK-IN PAR SELFIE (GEMINI VISION)
// =====================================================

app.post('/api/checkin', async (req, res) => {
    const { selfieBase64, lat, lng, agentName, agentPhone } = req.body;
    const timestamp = new Date().toISOString();

    try {
        let verificationResult = { valid: true, message: "Check-in manuel validé." };

        if (selfieBase64 && ai) {
            // Analyse du selfie avec Gemini Vision
            const analysis = await analyzeImageWithGemini(
                selfieBase64,
                `Tu es un système RH de vérification de présence.
Analyse cette photo (selfie de check-in).
Date/Heure : ${new Date().toLocaleString('fr-FR')}
Position GPS : ${lat || 'N/A'}, ${lng || 'N/A'}

Vérifie :
1. Y a-t-il un visage humain clairement visible ?
2. La photo semble-t-elle être un vrai selfie (pas une photo d'écran) ?
3. L'environnement est-il cohérent avec un lieu de travail extérieur ?

Réponds en JSON :
{
  "visage_detecte": true/false,
  "selfie_authentique": true/false,
  "environnement_coherent": true/false,
  "validation": true/false,
  "commentaire": "Explication courte"
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
                verificationResult = { valid: true, message: analysis };
            }
        }

        // Enregistrer dans Supabase
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
        } catch (e) {
            console.warn("Table checkins non disponible, log en mémoire.");
        }

        if (verificationResult.valid) {
            // NOUVEAU : Met immédiatement l'agent "En Ligne" sur la carte et pour l'IA
            await supabase.from('users').upsert({
                phone_number: agentPhone,
                name: agentName,
                role: 'Agent',
                last_lat: lat,
                last_lng: lng,
                is_online: true,
                last_seen: new Date().toISOString()
            }, { onConflict: 'phone_number' });

            pushEvent('DG', 'rh', `✅ Check-in validé par Gemini : ${agentName || 'Agent'} à ${new Date().toLocaleTimeString()}. Position: ${lat}, ${lng}`, 'system');
            res.json({ success: true, message: "Check-in validé par IA.", verification: verificationResult });
        } else {
            pushEvent('DG', 'rh', `⚠️ Check-in REFUSÉ par Gemini : ${agentName || 'Agent'}. Raison : ${verificationResult.message}`, 'system');
            res.json({ success: false, message: "Check-in refusé par l'IA.", verification: verificationResult });
        }
    } catch (error) {
        console.error("Erreur checkin:", error.message);
        pushEvent('DG', 'rh', `Nouveau Check-in terrain enregistré (mode classique).`, 'system');
        res.json({ success: true, message: "Check-in validé (mode classique)." });
    }
});

// =====================================================
// GÉNÉRATION DE DOCUMENTS & IMAGES MARKETING (GEMINI)
// =====================================================

app.post('/api/generate-document', async (req, res) => {
    try {
        const { type, customPrompt } = req.body;
        if (!ai) return res.status(500).json({ success: false, error: "Client Gemini non initialisé." });

        // 1. RÉCUPÉRER LES VRAIES DONNÉES DE PRODUCTION (RAG)
        const { count: pendingCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: completedCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const { count: agentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'Agent').eq('is_online', true);

        const total = (pendingCount || 0) + (completedCount || 0);
        const tauxResolution = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        const dateStr = new Date().toLocaleDateString('fr-FR');

        let systemPrompt = "";
        let finalPrompt = "";
        let options = {};

        if (type === 'rapport') {
            systemPrompt = `Tu es Natango Marketing. Génère un rapport opérationnel complet en format Markdown.
Données du système :
- Incidents actifs : ${pendingCount || 0}
- Incidents résolus : ${completedCount || 0}
- Date : ${dateStr}
${customPrompt ? `Instructions spéciales : ${customPrompt}` : ''}

Génère un rapport professionnel avec : titre, résumé exécutif, métriques clés, analyse, recommandations.`;
            finalPrompt = "Génère le rapport Markdown.";
        }
        else if (type === 'infographie') {
            // 🤖 NOUVEAU : GEMINI DEVIENT DESIGNER SVG
            systemPrompt = `Tu es Natango AI Vision, designer expert en infographies vectorielles (SVG).
Ton but est de créer un visuel moderne, épuré et professionnel pour le marketing de la propreté urbaine.

DONNÉES RÉELLES DU TERRAIN (À INTÉGRER IMPÉRATIVEMENT) :
- Date : ${dateStr}
- Incidents Résolus : ${completedCount || 0}
- Incidents En Attente : ${pendingCount || 0}
- Taux de Résolution : ${tauxResolution}%
- Agents Actifs : ${agentCount || 0}

CONSIGNES DE DESIGN :
- Génère UNIQUEMENT le code <svg>...</svg> complet, sans texte explicatif avant ou après.
- Utilise une palette de couleurs pro : Fond sombre (#111b21), accents bleus (#0056FF), vert succès (#00a884), rouge urgence (#ef4444).
- Structure : Un titre clair, 3 ou 4 cartes de métriques distinctes avec icônes simples, et un graphique visuel (barres ou cercle).
- Le texte doit être lisible et les chiffres gros.
- Adapte le design si l'utilisateur donne une instruction spéciale : ${customPrompt || 'Aucune'}`;

            finalPrompt = "Génère l'infographie SVG dynamique basée sur les données réelles fournies.";
        } else {
            systemPrompt = customPrompt || "Génère un document marketing résumant les opérations.";
            finalPrompt = systemPrompt;
        }

        // 2. APPEL À GEMINI 2.0 FLASH
        const result = await chatWithGemini(systemPrompt, [], finalPrompt, options);

        // 3. SAUVEGARDER LE RAPPORT DANS LA NOUVELLE TABLE SUPABASE
        try {
            await supabase.from('generated_reports').insert([{
                report_type: type,
                content: result, // Sauvegarde le Markdown ou le code SVG
                created_by: 'Natango Marketing'
            }]);
        } catch (e) { console.warn("Erreur sauvegarde rapport:", e.message); }

        res.json({
            success: true,
            document: result, // Contient le code SVG ou Markdown
            type,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erreur generate-document:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!ai) return res.status(500).json({ success: false, error: "Client Gemini non initialisé." });

        // Utiliser Gemini Imagen pour générer une image
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{
                parts: [{ text: `Génère une image professionnelle pour le marketing de gestion des déchets urbains. Description: ${prompt}` }]
            }],
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            }
        });

        // Extraire l'image de la réponse
        let imageBase64 = null;
        let textResponse = '';

        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageBase64 = part.inlineData.data;
                } else if (part.text) {
                    textResponse = part.text;
                }
            }
        }

        res.json({
            success: true,
            image: imageBase64,
            description: textResponse,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erreur generate-image:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// NOTES DE RÉUNION (HISTORIQUE)
// =====================================================

app.get('/api/meetings', async (req, res) => {
    try {
        const { data: meetings, error } = await supabase
            .from('meetings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const parsed = (meetings || []).map(m => ({
            ...m,
            summary: JSON.parse(m.summary || '{}'),
            participants: JSON.parse(m.participants || '[]'),
            actions: JSON.parse(m.actions || '[]'),
            decisions: JSON.parse(m.decisions || '[]'),
            notes: JSON.parse(m.notes || '[]'),
        }));

        res.json({ success: true, meetings: parsed });
    } catch (e) {
        console.warn("Table 'meetings' non disponible:", e.message);
        res.json({ success: true, meetings: [] });
    }
});

app.get('/api/meetings/:id', async (req, res) => {
    try {
        const { data: meeting, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json({
            success: true,
            meeting: {
                ...meeting,
                summary: JSON.parse(meeting.summary || '{}'),
                participants: JSON.parse(meeting.participants || '[]'),
                actions: JSON.parse(meeting.actions || '[]'),
                decisions: JSON.parse(meeting.decisions || '[]'),
                notes: JSON.parse(meeting.notes || '[]'),
            }
        });
    } catch (e) {
        res.status(404).json({ success: false });
    }
});

// =====================================================
// DOSSIER RH : STATISTIQUES JOURNALIÈRES DE L'AGENT
// =====================================================
app.get('/api/agent-stats/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        // Date du jour au format YYYY-MM-DD
        const today = new Date().toLocaleDateString('en-CA');

        // 1. Chercher le check-in du jour
        const { data: checkin } = await supabase
            .from('checkins')
            .select('timestamp, is_valid')
            .eq('agent_phone', phone)
            .gte('timestamp', today)
            .order('timestamp', { ascending: true })
            .limit(1)
            .single();

        // 2. Chercher les missions terminées aujourd'hui
        const { data: missions } = await supabase
            .from('incidents')
            .select('incident_id')
            .eq('assigned_agent_phone', phone)
            .eq('status', 'completed')
            .gte('timestamp_completed', today);

        const missionsCount = missions ? missions.length : 0;
        const xp = 1200 + (missionsCount * 150); // XP = Base + 150 points par déchet nettoyé

        let status = 'Absent';
        let checkinTime = null;

        if (checkin) {
            const dateObj = new Date(checkin.timestamp);
            checkinTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            // RÈGLE RH : Avant 9h00 = Présent / Après 9h00 = Retard
            status = dateObj.getHours() < 9 ? 'Présent' : 'Retard';
        }

        res.json({ success: true, stats: { status, checkinTime, missionsCount, xp } });
    } catch (error) {
        console.error("Erreur agent-stats:", error.message);
        res.status(500).json({ success: false });
    }
});

// =====================================================
// DASHBOARD TEMPS RÉEL (WebSocket + HTTP fallback)
// =====================================================

// Clients dashboard connectés en WebSocket
const dashboardClients = new Set();

// Fonction pour récupérer les données dashboard depuis Supabase
async function getDashboardData() {
    let pendingCount = 0, completedCount = 0, assignedCount = 0;
    let recentIncidents = [];
    let checkinCount = 0;
    let onlineAgents = [];

    try {
        const { count: pCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: cCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const { count: aCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'assigned');
        pendingCount = pCount || 0;
        completedCount = cCount || 0;
        assignedCount = aCount || 0;
    } catch (e) { }

    // Incidents récents avec infos enrichies (citoyen, agent, lieu)
    try {
        const { data } = await supabase.from('incidents')
            .select('incident_id, type, priority, status, timestamp_reported, timestamp_completed, gps_latitude, gps_longitude, citizen_name, citizen_phone, assigned_agent_name, assigned_agent_phone, location_description, report_text')
            .order('timestamp_reported', { ascending: false }).limit(20);
        recentIncidents = data || [];
    } catch (e) { }

    // Check-ins du jour
    try {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase.from('checkins').select('*', { count: 'exact', head: true }).gte('timestamp', today);
        checkinCount = count || 0;
    } catch (e) { }

    // POSITIONS RÉELLES DES AGENTS (pour RH board + heatmap)
    try {
        const { data: agents } = await supabase
            .from('users')
            .select('phone_number, name, role, last_lat, last_lng, is_online, last_seen')
            .eq('role', 'Agent');

        onlineAgents = (agents || []).map(a => ({
            phone: a.phone_number,
            name: a.name,
            lat: a.last_lat,
            lng: a.last_lng,
            isOnline: a.is_online && a.last_seen && (Date.now() - new Date(a.last_seen).getTime() < 300000),
            lastSeen: a.last_seen,
        }));
    } catch (e) { }

    const totalIncidents = pendingCount + completedCount + assignedCount;
    const avgFillRate = pendingCount > 0 ? Math.min(100, 30 + (pendingCount * 15)) : 30;
    const resolutionRate = totalIncidents > 0 ? Math.round((completedCount / totalIncidents) * 100) : 0;

    // Calcul du temps moyen d'intervention (en minutes)
    let avgInterventionTime = 0;
    try {
        const { data: times } = await supabase
            .from('incidents')
            .select('timestamp_reported, timestamp_completed')
            .eq('status', 'completed')
            .not('timestamp_completed', 'is', null);

        if (times && times.length > 0) {
            let totalMins = 0;
            times.forEach(t => {
                const diffMs = new Date(t.timestamp_completed) - new Date(t.timestamp_reported);
                totalMins += Math.round(diffMs / 60000); // Conversion en minutes
            });
            avgInterventionTime = Math.round(totalMins / times.length);
        }
    } catch (e) { }

    // Heatmap basée sur les positions RÉELLES des incidents
    const heatmapPoints = recentIncidents
        .filter(i => i.gps_latitude && i.gps_longitude && i.status !== 'completed')
        .map(i => ({ lat: i.gps_latitude, lng: i.gps_longitude, weight: i.priority === 'Critical' ? 1.0 : i.priority === 'High' ? 0.7 : 0.4 }));

    return {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fillRate: avgFillRate,
        avgInterventionTime,
        incidents: {
            pending: pendingCount,
            completed: completedCount,
            assigned: assignedCount,
            total: totalIncidents,
        },
        resolutionRate,
        checkinsToday: checkinCount,
        recentIncidents,
        agents: onlineAgents,
        heatmapPoints,
    };
}

// Broadcaster : envoie les données à tous les clients dashboard connectés
async function broadcastDashboardUpdate() {
    if (dashboardClients.size === 0) return;
    try {
        const data = await getDashboardData();
        const message = JSON.stringify({ type: 'dashboard_update', data });
        for (const client of dashboardClients) {
            try { client.send(message); } catch (e) { dashboardClients.delete(client); }
        }
    } catch (e) {
        console.error("Erreur broadcast dashboard:", e.message);
    }
}

// WebSocket temps réel pour le dashboard
app.ws('/api/dashboard-ws', async (ws, req) => {
    dashboardClients.add(ws);
    console.log(`📊 Dashboard client connecté (${dashboardClients.size} actifs)`);

    // Envoyer les données initiales
    try {
        const data = await getDashboardData();
        ws.send(JSON.stringify({ type: 'dashboard_update', data }));
    } catch (e) { }

    ws.on('close', () => {
        dashboardClients.delete(ws);
        console.log(`📊 Dashboard client déconnecté (${dashboardClients.size} actifs)`);
    });
});

// HTTP fallback (polling) — pour compatibilité
app.get('/api/dashboard-live', async (req, res) => {
    try {
        const data = await getDashboardData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Mise à jour automatique toutes les 5 secondes pour les clients connectés
setInterval(broadcastDashboardUpdate, 5000);

// =====================================================
// MODULE RH : VÉRIFICATION AUTOMATIQUE DE 9H00
// =====================================================
let hrCheckDoneToday = false;

setInterval(async () => {
    const now = new Date();
    // On vérifie s'il est 9h00 (Heure de Dakar GMT)
    if (now.getHours() === 9 && now.getMinutes() === 0 && !hrCheckDoneToday) {
        hrCheckDoneToday = true;
        console.log("⏰ 09:00 - Lancement de la vérification RH automatique...");

        try {
            const today = now.toLocaleDateString('en-CA'); // Format YYYY-MM-DD

            // 1. Récupérer tous les agents autorisés
            const { data: agents } = await supabase.from('authorized_users').select('phone_number, name').eq('role', 'Agent');

            // 2. Récupérer les check-ins d'aujourd'hui
            const { data: checkins } = await supabase.from('checkins').select('agent_phone').gte('timestamp', today);
            const checkedInPhones = (checkins || []).map(c => c.agent_phone);

            // 3. Croiser les données et alerter les retardataires
            if (agents) {
                agents.forEach(agent => {
                    if (!checkedInPhones.includes(agent.phone_number)) {
                        // Alarme sur le téléphone de l'agent
                        pushEvent('Agent', agent.phone_number, `Il est 9h00 passées. Confirmez votre statut de présence.`, 'hr_attendance_prompt');
                    }
                });
            }
        } catch (e) {
            console.error("Erreur vérification RH:", e.message);
        }
    }

    // Réinitialiser le drapeau à minuit pour le lendemain
    if (now.getHours() === 0) { hrCheckDoneToday = false; }
}, 60000); // Vérifie l'heure toutes les minutes

// --- ROUTE POUR RECEVOIR LA RÉPONSE DE L'AGENT ---
app.post('/api/hr-attendance', async (req, res) => {
    const { phone, name, isComing, reason } = req.body;

    try {
        if (isComing) {
            // L'agent arrive (Retard)
            pushEvent('DG', 'rh', `⚠️ RETARD : ${name} n'est pas encore en poste mais signale son arrivée. Motif : "${reason}".`, 'system');
            // Note : Il reste éligible à l'assignation MAIS il devra quand même faire son selfie en arrivant pour passer "En Ligne" GPS.
        } else {
            // L'agent ne vient pas (Absence)
            pushEvent('DG', 'rh', `❌ ABSENCE : ${name} est absent aujourd'hui. Motif : "${reason}".`, 'system');
            // On le force hors-ligne pour que l'auto-assignation l'ignore totalement
            await supabase.from('users').update({ is_online: false, last_lat: null, last_lng: null }).eq('phone_number', phone);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Backend Natango OS démarré sur le port ${PORT}`);
    console.log(`📡 Pipeline : Supabase DB → Groq (STT) → Gemini (LLM/Vision/Live) → ElevenLabs (TTS)`);
    console.log(`🗺️  Google Maps Directions API activée`);
    console.log(`🖼️  Gemini Vision (analyse photos avant/après)`);
    console.log(`📋 Gemini (génération documents/infographies)`);
    console.log(`🎙️  Gemini Live API (mode réunion WebSocket)\n`);
});