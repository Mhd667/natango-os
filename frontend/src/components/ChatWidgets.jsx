import React from 'react';
import { Wallet, TrendingUp, AlertCircle, Users, Download, FileText, Activity, ShieldCheck } from 'lucide-react';

export default function ChatWidgets({ msg }) {
  // 1. LE WIDGET FINANCE (ACCOUNT)
  if (msg.type === 'widget_finance') {
    const { collected, missing, expected, paidCount, unpaidCount, currency } = msg.data;
    const progress = Math.round((collected / expected) * 100);

    return (
      <div className="flex justify-start my-2 animate-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-[#111b21] w-[90%] md:w-[400px] rounded-[32px] rounded-tl-sm p-5 shadow-xl border border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#0056FF]">
              <Wallet size={16} />
            </div>
            <span className="font-black text-sm uppercase tracking-widest text-[#0056FF]">Trésorerie Live</span>
          </div>

          <div className="mb-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Encaissé</p>
            <p className="text-3xl font-black dark:text-white">{collected.toLocaleString('fr-SN')} <span className="text-lg text-gray-500">{currency}</span></p>
          </div>

          <div className="relative w-full h-3 bg-gray-100 dark:bg-[#202c33] rounded-full overflow-hidden mb-4">
            <div className="absolute top-0 left-0 h-full bg-[#0056FF] rounded-full" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/20">
              <p className="text-[10px] font-black text-green-600 uppercase">À Jour</p>
              <p className="text-lg font-black text-green-700 dark:text-green-400">{paidCount} foyers</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/20">
              <p className="text-[10px] font-black text-red-600 uppercase">Impayés</p>
              <p className="text-lg font-black text-red-700 dark:text-red-400">{unpaidCount} foyers</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 float-right mt-3">{msg.time}</span>
        </div>
      </div>
    );
  }

  // 2. LE WIDGET CRM (CUSTOMER)
  if (msg.type === 'widget_dashboard') {
    const { target, activeQR, upToDate, satisfaction } = msg.data;
    const penetration = Math.round((activeQR / target) * 100);

    return (
      <div className="flex justify-start my-2 animate-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-[#111b21] w-[90%] md:w-[400px] rounded-[32px] rounded-tl-sm p-5 shadow-xl border border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
              <Users size={16} />
            </div>
            <span className="font-black text-sm uppercase tracking-widest text-indigo-600">État du Réseau QR</span>
          </div>

          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adhérents Actifs</p>
              <p className="text-3xl font-black dark:text-white">{activeQR} <span className="text-sm font-medium text-gray-500">/ {target}</span></p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-indigo-500">{penetration}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#202c33] p-3 rounded-2xl border border-gray-100 dark:border-transparent">
            <ShieldCheck size={20} className="text-green-500" />
            <p className="text-sm font-bold dark:text-[#e9edef]">{satisfaction} de satisfaction client (Validations WhatsApp)</p>
          </div>
          <span className="text-[10px] text-gray-400 float-right mt-3">{msg.time}</span>
        </div>
      </div>
    );
  }

  // 3. LE WIDGET EXPORT (FICHIER CSV/EXCEL)
  if (msg.type === 'file_export') {
    return (
      <div className="flex justify-start my-2 animate-in slide-in-from-left-4 duration-300">
        <div className="bg-white dark:bg-[#202c33] max-w-[85%] rounded-[24px] rounded-tl-sm p-4 shadow-md border border-gray-100 dark:border-transparent">
          <p className="text-[14px] font-medium dark:text-[#e9edef] mb-3">{msg.content}</p>
          
          <a 
            href={`data:${msg.mimeType};base64,${msg.fileData}`} 
            download={msg.fileName}
            className="flex items-center gap-3 bg-gray-100 dark:bg-[#111b21] hover:bg-gray-200 dark:hover:bg-black p-3 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600">
              <FileText size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold dark:text-white">{msg.fileName}</p>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Document Généré</p>
            </div>
            <Download size={20} className="text-gray-400" />
          </a>
          <span className="text-[10px] text-gray-500 float-right mt-2">{msg.time}</span>
        </div>
      </div>
    );
  }

  // 4. LE WIDGET BILAN DE SANTÉ (HUB)
  if (msg.type === 'health_report') {
    return (
      <div className="flex justify-start my-2 animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-gray-900 to-black w-[95%] md:w-[450px] rounded-[32px] rounded-tl-sm p-6 shadow-2xl border border-gray-800">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-4">
            <Activity size={20} className="text-blue-500" />
            <span className="font-black text-sm uppercase tracking-widest text-white">Bilan de Santé Exécutif</span>
          </div>
          <p className="text-[14px] leading-relaxed font-medium text-gray-300 whitespace-pre-wrap">
            {msg.content}
          </p>
          <span className="text-[10px] text-gray-600 float-right mt-4">{msg.time}</span>
        </div>
      </div>
    );
  }

  return null;
}