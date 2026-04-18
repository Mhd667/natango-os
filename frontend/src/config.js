// Configuration dynamique de l'API Natango
export const getApiBaseUrl = (userRole) => {
  // Si l'utilisateur est un Agent, on pointe vers le serveur de production (Vercel)
  if (userRole === 'Agent') {
    return 'https://natango-os.vercel.app';
  }
  
  // Dans tous les autres cas (DG, Superviseur en local), on pointe sur localhost
  return 'https://natango-os-production.up.railway.app';
};
