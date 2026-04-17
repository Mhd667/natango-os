// =====================================================
// RAG ENGINE : RÉCUPÉRATION DE CONTEXTE SUPABASE EN TEMPS RÉEL
// =====================================================
// supabase est injecté en paramètre pour éviter tout import circulaire

export async function getContextData(instanceType, supabase) {
    let contextString = "";

    if (instanceType === 'account') {
        const { data: payments } = await supabase.from('payments').select('*, households(resident_name)').limit(10);
        const { data: totals } = await supabase.rpc('get_financial_summary');
        contextString = `ÉTAT FINANCIER RÉEL : Les 10 dernières transactions : ${JSON.stringify(payments)}. Résumé global : ${JSON.stringify(totals)}.`;
    }

    if (instanceType === 'customer') {
        const { data: households } = await supabase.from('households').select('*').limit(20);
        const { data: suspended } = await supabase.from('households').select('count').eq('subscription_status', 'suspended');
        contextString = `BASE CRM RÉELLE : Foyers actifs : ${JSON.stringify(households)}. Foyers suspendus : ${JSON.stringify(suspended)}.`;
    }

    if (instanceType === 'hub') {
        const { data: counts } = await supabase.from('households').select('subscription_status');
        const { data: lastOps } = await supabase.from('service_logs').select('*, households(resident_name)').limit(5);
        contextString = `VUE GLOBALE : Répartition status : ${JSON.stringify(counts)}. Dernières collectes terrain : ${JSON.stringify(lastOps)}.`;
    }

    return contextString;
}