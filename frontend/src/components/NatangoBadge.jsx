import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function NatangoBadge({ bacId = "BAC-001", villa = "45" }) {
    // L'information cachée dans le QR Code (ce que NatangoHire va lire)
    const qrData = JSON.stringify({ id: bacId, type: "natango_bac" });

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-[#0b141a] min-h-screen">
            {/* La Carte Glassmorphism */}
            <div className="relative overflow-hidden w-80 bg-[#111b21]/80 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col items-center">

                {/* Effet de lumière subtil en arrière-plan */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0056FF] rounded-full blur-[80px] opacity-30"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-500 rounded-full blur-[80px] opacity-20"></div>

                {/* Header Badge */}
                <div className="text-center z-10 mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tighter">NATANGO</h1>
                    <p className="text-[#0056FF] text-xs font-bold uppercase tracking-widest mt-1">Operating Soul</p>
                </div>

                {/* Le QR Code (Fond blanc pour que les scanners le lisent bien) */}
                <div className="z-10 p-4 bg-white rounded-3xl shadow-inner mb-8">
                    <QRCodeSVG
                        value={qrData}
                        size={180}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"H"} // Haute correction d'erreur (si l'étiquette est abîmée dehors)
                    />
                </div>

                {/* Footer Badge (Infos lisibles par l'humain) */}
                <div className="z-10 w-full flex justify-between items-center px-2 text-white border-t border-white/10 pt-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400">ID SÉCURISÉ</span>
                        <span className="font-mono font-bold">{bacId}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs text-gray-400">VILLA</span>
                        <span className="font-black text-xl">{villa}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}