// FIX CACHE LINUX 123
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import expressWs from 'express-ws';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';

// Import des 5 piliers Natango
import { initAccountRoutes } from './services/account.js';
import { initCustomerRoutes } from './services/customer.js';
import { initOpsRoutes } from './services/ops.js';
import { initRhRoutes } from './services/rh.js';
import { initHubRoutes } from './services/hub.js';
import { onboardClient } from './services/NatangoHire.js';

dotenv.config();

const app = express();
expressWs(app);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuration Multer pour les fichiers audio/images
const upload = multer({ dest: 'uploads/' });

// =====================================================
// 1. CONNEXIONS BDD & IA
// =====================================================
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let ai;
try {
    if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log("✅ Client Gemini initialisé.");
    } else {
        console.warn("⚠️ GEMINI_API_KEY non définie.");
    }
} catch (e) { console.error("Erreur Gemini:", e); }

let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        console.log("✅ Client Groq (Whisper STT) initialisé.");
    } else {
        console.warn("⚠️ GROQ_API_KEY non définie.");
    }
} catch (e) { console.error("Erreur Groq:", e); }

// ==========================================
// 1.4. LA BASE DES AGENTS (Autorisés)
// ==========================================
const agentsDB = {
    "221787825960@c.us": { nom: "Mouhamed Sow", role: "Agent Principal" },
    "221771167353@c.us": { nom: "Agent 2", role: "Onboarding" },
    "2217XXXXXXXX@c.us": { nom: "Agent 3", role: "Ops" }
};

// ==========================================
// 1.5. LA BASE DE DONNÉES DE CE SOIR (En mémoire)
// ==========================================
const liveTestDB = {
    "221770000001@c.us": { nom: "Maison 1", statut: "En attente", alertes: [] },
    "221770000002@c.us": { nom: "Maison 2", statut: "En attente", alertes: [] },
};

// ==========================================
// 1.6. LE CERVEAU IA (Gemini API Native)
// ==========================================
async function natangoBrain(clientMessage, clientPhone) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Tu es Natango Customer, l'Operating Soul d'un service de gestion logistique (poubelles). 
    Nous sommes en test live ce soir sur un carré de 6 maisons et 1 jardin à la Cité Alioune Sow.
    Le client avec le numéro ${clientPhone} vient de t'envoyer ce message : "${clientMessage}".
    
    Règles :
    1. Sois extrêmement poli, pro et concis.
    2. Si le client signale une absence ou un problème, rassure-le et dis que Natango Ops a mis à jour l'itinéraire de l'agent.
    3. Ne fais pas de longues phrases. Utilise des emojis avec parcimonie.`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
            })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini est injoignable:", error);
        return "Natango Ops : Bien reçu. Notre agent est en route pour la zone.";
    }
}

// ==========================================
// 1.6.5. MOTEUR VOCAL ELEVENLABS
// ==========================================
async function elevenLabsTTS(text) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error(`ElevenLabs Error: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    } catch (error) {
        console.error("ElevenLabs TTS failed:", error);
        return null;
    }
}

// ==========================================
// 1.7. LE MOTEUR WHATSAPP (Version Railway)
// ==========================================
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // 👈 Juste ça, on a retiré l'executablePath
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('\n📱 TEST LIVE CE SOIR : SCANNE LE QR CODE\n');
    console.log('--- COPIEZ LE TEXTE CI-DESSOUS ---');
    console.log(qr); // Affiche le texte brut du QR code
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('🟢 NATANGO CUSTOMER EST ARMÉ ET EN LIGNE !');
});

// ==========================================
// LE CERVEAU WHATSAPP (Avec accès Admin)
// ==========================================
// IMPORTANT : on utilise 'message_create' pour lire TES propres messages
// Ton numéro de DG (Format WhatsApp = indicatif + numéro + @c.us)
const NUMERO_DG = '221787825960@c.us'; // Identifié comme Mouhamed Sow (Agent Principal)

whatsappClient.on('message_create', async (msg) => {
    // LE MOUCHARD NATANGO :
    console.log(`🚨 DING DONG ! Message de ${msg.from} : ${msg.body}`);

    // --- 1. LOGIQUE DU DIRECTEUR GÉNÉRAL (Toi) ---
    // On vérifie si c'est toi qui écris (soit via le numéro, soit msg.fromMe)
    if (msg.from === NUMERO_DG || msg.fromMe) {
        // Commande de validation de paiement : "payé 771234567" ou "!paye 771234567"
        if (msg.body.toLowerCase().startsWith('payé')) {
            console.log('✅ Ordre du DG reçu : Activation réelle dans Supabase');
            const cible = msg.body.split(' ')[1];
            
            if (cible) {
                const clientPhone = cible.replace(/[^0-9]/g, '');
                const chatIdCible = `221${clientPhone}@c.us`;
                
                try {
                    // 1. IMPACT LOGISTIQUE (Ops) : On active le client dans la base
                    const { error: clientError } = await supabase
                        .from('clients')
                        .update({ statut_abonnement: 'actif' })
                        .eq('telephone', clientPhone);

                    // 2. IMPACT FINANCIER (Account) : On crée la ligne de paiement
                    const { error: paymentError } = await supabase
                        .from('paiements')
                        .insert([{
                            montant: 3500,
                            telephone_client: clientPhone,
                            valide_par_dg: true,
                            date_paiement: new Date().toISOString()
                        }]);

                    if (clientError || paymentError) throw new Error("Erreur de mise à jour Supabase");

                    // Mise à jour de la mémoire locale pour le test live
                    if (liveTestDB[chatIdCible]) {
                        liveTestDB[chatIdCible].statut = "Payé";
                    }

                    console.log(`💰 Réalité modifiée : +3500 FCFA et Client ${clientPhone} activé.`);
                    
                    // Réponse au DG
                    await msg.reply(`🫡 C'est fait DG. Statut : ACTIF. Impact : CA +3500 FCFA. Le client ${clientPhone} est maintenant visible sur la carte Ops.`);
                    
                    // Notification automatique au client
                    const messageClient = "✅ *PAIEMENT REÇU* !\n\nVotre abonnement Natango est désormais actif. Nos équipes de ramassage passeront chaque matin. Merci de votre confiance ! ♻️";
                    await whatsappClient.sendMessage(chatIdCible, messageClient);
                    
                } catch (err) {
                    console.error("Erreur d'écriture Supabase:", err);
                    await msg.reply("❌ Erreur lors de l'écriture dans Supabase. Vérifiez la connexion.");
                }
                return;
            }
        }
        // IMPORTANT : Pour éviter les boucles infinies, on ignore les messages du bot,
        if (msg.fromMe && !msg.body.toLowerCase().startsWith('lucie')) {
            return;
        }
    }

    // --- 2. LOGIQUE DU FILTRE CLIENT (Simplifiée pour les tests) ---
    const isDG = msg.from.includes(NUMERO_DG.split('@')[0]) || msg.fromMe;
    
    if (!isDG) {
        // Optionnel : Vous pouvez remettre le filtre strict ici plus tard
        // const isClientValide = liveTestDB[msg.from] ? true : false;
        
        if (msg.from.includes('@g.us')) {
            console.log(`🔇 Groupe ignoré (${msg.from})`);
            return; 
        }
        
        console.log(`👥 Message d'un client (${msg.from}).`);
    } else {
        console.log(`👑 Message du DG reconnu.`);
    }

    // --- 3. CONNEXION AU CERVEAU GEMINI (Audio & Texte) ---
    try {
        let messageContent = msg.body;

        // Gestion des messages vocaux (STT)
        if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt')) {
            console.log(`🎙️ Message vocal reçu de ${liveTestDB[msg.from]?.nom || 'Test'}, transcription...`);
            const media = await msg.downloadMedia();
            const transcription = await transcribeAudio(media.data, media.mimetype);
            if (transcription) {
                messageContent = transcription;
                console.log(`📝 Transcription : "${messageContent}"`);
            } else {
                return console.error("Échec de transcription.");
            }
        }

        if (!messageContent) return;

        console.log('🧠 Réflexion de Lucie (Gemini) en cours...');
        const iaResponse = await natangoBrain(messageContent, msg.from);
        
        // Envoi de la réponse texte
        await msg.reply(iaResponse);
        console.log('✅ Réponse textuelle envoyée.');

    } catch (error) {
        console.error('❌ ERREUR CRITIQUE PENDANT LA RÉPONSE :', error);
    }
});
// ==========================================
// LE COUPE-CIRCUIT POUR LA DÉMO CLOUD
// ==========================================
const MODE_DEMO_SANS_WHATSAPP = true; // Laisse sur "true" pour le push vers Railway

if (!MODE_DEMO_SANS_WHATSAPP) {
    console.log("⏳ Initialisation du moteur WhatsApp (Puppeteer)...");
    whatsappClient.initialize().then(() => {
        console.log("✅ Appel à initialize() terminé.");
    }).catch(err => {
        console.error("❌ Erreur CRITIQUE init WhatsApp:", err);
    });
} else {
    console.log("⚠️ MODE DÉMO ACTIF : Le lourd moteur WhatsApp est désactivé. Le serveur tourne à 100%.");
}

// =====================================================
// 2. BUS D'ÉVÉNEMENTS INTERNE (Le système nerveux)
// =====================================================
const systemEvents = [];

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
            // Heure fixée sur Dakar pour la cohérence des logs
            time: new Date().toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' }),
            ...additionalProps
        }
    });
}

// Les interfaces (Front) viennent récupérer leurs notifications ici
app.get('/api/events/:role/:phone', (req, res) => {
    const { role, phone } = req.params;
    const pending = systemEvents.filter(e => (e.targetRole === role || e.targetRole === 'All') && !e.acked.includes(phone));
    pending.forEach(e => e.acked.push(phone));
    res.json({ success: true, events: pending });
});

// =====================================================
// 3. SÉCURITÉ & AUTHENTIFICATION
// =====================================================
app.post('/api/auth/login', async (req, res) => {
    const { phone, pin } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('authorized_users')
            .select('*')
            .eq('phone_number', phone)
            .eq('pin_code', pin)
            .single();

        if (user) {
            res.json({ success: true, user: { name: user.name, phone: user.phone_number, role: user.role } });
        } else {
            res.json({ success: false, message: "Accès refusé. Vérifiez vos identifiants." });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "Erreur serveur de base de données." });
    }
});

// =====================================================
// 4. ORCHESTRATION DES SERVICES (Injection de dépendances)
// =====================================================
const dependencies = { ai, groq, supabase, pushEvent, upload };

// On passe l'application Express et les outils globaux à chaque module
initAccountRoutes(app, dependencies);
initCustomerRoutes(app, dependencies);
initOpsRoutes(app, dependencies);
initRhRoutes(app, dependencies);
initHubRoutes(app, dependencies);

// =====================================================
// 4.5. ROUTES GLOBALES (DASHBOARD & CHAT DE BASE)
// =====================================================

// Le flux de données en direct pour le Cockpit du DG
app.get('/api/dashboard-live', async (req, res) => {
    try {
        const { count: pendingCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: completedCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const { count: assignedCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'assigned');

        const { data: recentIncidents } = await supabase.from('incidents').select('*').order('timestamp_reported', { ascending: false }).limit(20);
        const { data: agentsData } = await supabase.from('users').select('*').eq('role', 'Agent');

        const realAgents = (agentsData || []).map(a => ({
            ...a,
            status: a.is_online ? 'active' : 'offline',
            is_checked_in: a.is_online
        }));

        res.json({
            success: true,
            data: {
                time: new Date().toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' }),
                fillRate: pendingCount > 0 ? Math.min(100, 30 + (pendingCount * 15)) : 30,
                avgInterventionTime: 12,
                incidents: { pending: pendingCount || 0, completed: completedCount || 0, assigned: assignedCount || 0, total: (pendingCount || 0) + (completedCount || 0) + (assignedCount || 0) },
                recentIncidents: recentIncidents || [],
                agents: realAgents,
                heatmapPoints: (recentIncidents || []).filter(i => i.gps_latitude).map(i => ({ lat: i.gps_latitude, lng: i.gps_longitude, weight: i.priority === 'Critical' ? 1.0 : 0.5 }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Le Chat générique (Pour Hub, Ops et RH)
app.post('/api/chat', async (req, res) => {
    const { targetAi, message, history = [] } = req.body;
    if (!ai) return res.status(500).json({ success: false, message: "IA non connectée." });

    try {
        const systemPrompt = `Tu es Natango ${targetAi.toUpperCase()}, une entité de l'Operating Soul. Sois bref, direct et ultra-professionnel (Style Silicon Valley). Tu parles au Directeur Général ou à un Agent de terrain.`;
        const contents = history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: { systemInstruction: systemPrompt }
        });

        res.json({
            success: true,
            reply: { type: 'text_out', content: response.text, time: new Date().toLocaleTimeString('fr-SN', { timeZone: 'Africa/Dakar' }) }
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// =====================================================
// 4.7. GEMINI VOICE (TTS)
// =====================================================

// Route pour générer la voix officielle (Désormais via ElevenLabs)
app.post('/api/gemini-voice', async (req, res) => {
    const { text } = req.body;

    try {
        console.log(`🗣️ Synthèse vocale requise pour le frontend : "${text.substring(0, 30)}..."`);
        const audioBase64 = await elevenLabsTTS(text);

        if (audioBase64) {
            res.json({ audioContent: audioBase64, mimeType: 'audio/mp3' });
        } else {
            throw new Error("Échec de la génération audio ElevenLabs");
        }
    } catch (error) {
        console.error('Erreur ElevenLabs Voice Route:', error);
        res.status(500).json({ error: 'Impossible de générer la voix via ElevenLabs' });
    }
});

// Route pour la transcription audio (STT) via Gemini
async function transcribeAudio(audioBase64, mimeType = "audio/webm") {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [
                { inlineData: { mimeType: mimeType, data: audioBase64 } },
                { text: "Transcris fidèlement cet audio en français. Ne réponds que le texte transcrit, uniquement le texte." }
            ]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        
        // Sécurité : Vérifier si la transcription est présente
        const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!transcription) {
            console.warn("⚠️ Gemini n'a pas pu transcrire l'audio (Réponse vide).");
            return null;
        }
        return transcription;
    } catch (error) {
        console.error('Erreur Transcription:', error);
        return null;
    }
}

app.post('/api/stt', async (req, res) => {
    const { audio } = req.body;
    const transcription = await transcribeAudio(audio);
    if (transcription) {
        res.json({ success: true, transcription });
    } else {
        res.status(500).json({ success: false });
    }
});

// Route pour envoyer un message WhatsApp depuis le frontend
app.post('/api/whatsapp/send', async (req, res) => {
    const { numero, message } = req.body;

    const cleanNumber = numero.replace(/[^0-9]/g, '');
    const finalNumber = cleanNumber.startsWith('221') ? cleanNumber : `221${cleanNumber}`;
    const chatId = `${finalNumber}@c.us`;

    // Met à jour la mini base de données
    if(liveTestDB[chatId]) {
        liveTestDB[chatId].statut = "Validé (Vert)";
        console.log(`✅ ${liveTestDB[chatId].nom} est passé au VERT sur la Heatmap.`);
    }

    try {
        await whatsappClient.sendMessage(chatId, message);
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur d'envoi à l'agent:", error);
        res.status(500).json({ error: "Échec" });
    }
});

// Campagne de facturation de fin de mois
app.post('/api/billing/send-month-end', async (req, res) => {
    const tonNumeroWave = "77 000 00 00"; // Ton numéro Wave perso

    try {
        for (const [chatId, data] of Object.entries(liveTestDB)) {
            const message = `🌟 *NATANGO SERVICES* 🌟\n\nBonjour ${data.nom},\n\nC'est la fin du mois ! Pour confirmer vos ramassages, merci de régler votre abonnement de *3500 FCFA* sur ce numéro Wave :\n\n📱 *Wave :* ${tonNumeroWave}\n📝 *Motif :* Villa ${data.nom}\n\nDès réception, Natango Account validera votre statut automatiquement. Merci ! ♻️\n-- _Ndeye Fatou_`;
            
            await whatsappClient.sendMessage(chatId, message);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur Billing Send:", error);
        res.status(500).json({ error: "Erreur" });
    }
});

// Route API pour le scellement terrain (Natango Hire)
app.post('/api/hire/onboard', async (req, res) => {
    try {
        // On vérifie d'abord dans Supabase si l'envoyeur est bien un 'agent' ou 'dg'
        const { user_id } = req.headers; 
        
        if (!user_id) {
            return res.status(401).json({ error: "Identification requise" });
        }

        // On vérifie le rôle (On cherche dans authorized_users car c'est la table utilisée dans /api/auth/login)
        const { data: user } = await supabase
            .from('authorized_users')
            .select('role')
            .eq('id', user_id)
            .single();

        if (user?.role === 'Agent' || user?.role === 'DG' || user?.role === 'Superviseur') {
            // La logique de NatangoHire.js s'exécute ici
            const result = await onboardClient(req.body, liveTestDB, whatsappClient);
            res.status(200).json(result);
        } else {
            res.status(403).json({ error: "Accès non autorisé : rôle insuffisant" });
        }
    } catch (error) {
        console.error("Échec du scellement Natango Hire:", error);
        res.status(500).json({ error: "Erreur serveur lors de l'onboarding" });
    }
});

// Route pour récupérer le statut de toutes les villas (Live Map)
app.get('/api/dashboard/status', (req, res) => {
    res.json(liveTestDB);
});

// Endpoint pour le scellement d'un nouveau client (Abonnement)
app.post('/api/scellement', async (req, res) => {
    const { phone, name, quartier } = req.body;
    
    // Formatage du numéro pour WhatsApp
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = `221${cleanPhone}@c.us`;
    
    // Lien Wave (À personnaliser avec ton vrai numéro si besoin)
    const waveLink = `https://wave.com/pay/v1/221787825960?amount=3500`;

    const messageAbonnement = `🗑️ *SERVICE DE RAMASSAGE NATANGO*
    
Bonjour ${name}, 

Bienvenue dans notre service de ramassage quotidien pour le quartier ${quartier || 'Cité Alioune Sow'}. 

Pour activer votre abonnement mensuel et profiter de notre passage dès demain, merci de régler les frais de *3500 FCFA* via ce lien sécurisé Wave :
    
👉 ${waveLink}
    
Une fois le transfert effectué, je validerai votre compte automatiquement.`;

    try {
        await whatsappClient.sendMessage(formattedPhone, messageAbonnement);
        res.status(200).json({ success: true, message: 'Message de scellement envoyé' });
    } catch (err) {
        console.error("Erreur scellement WhatsApp:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// 5. DÉMARRAGE DU SERVEUR
// =====================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Backend Natango OS (City Edition) démarré sur le port ${PORT}`);
    console.log(`🧠 Instances connectées : Account, Customer, Ops, RH, Hub`);
    console.log(`📍 Fuseau horaire serveur : Africa/Dakar\n`);
});