export type SessionUser = {
  id: number | null;
  nome: string;
  email: string | null;
  perfil: string;
  permissoes: string[];
};

const SESSION_KEY = 'ritmesaSession';

export const getSession = (user?: SessionUser) => {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
};

export const readSession = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const can = (user: SessionUser | null, permission: string) =>
  !user || user.permissoes.includes('*') || user.permissoes.includes(permission);
