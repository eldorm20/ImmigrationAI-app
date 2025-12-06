// Mock DB logic ported exactly from the prototype
const nowISO = () => new Date().toISOString();
const safeJSONParse = (str: string | null, fallback: any) => { try { return JSON.parse(str || ""); } catch { return fallback; } };
const APP_VERSION = 2;

export interface Lead {
  id: number;
  name: string;
  email: string;
  country: string;
  visa: string;
  status: string;
  fee: number;
  date: string;
  createdAt: string;
}

export interface User {
  name: string;
  role: "staff" | "applicant";
  email: string;
}

const Storage = {
  get: (k: string, fallback: any = null) => {
    const v = localStorage.getItem(k);
    return v === null ? fallback : safeJSONParse(v, fallback);
  },
  set: (k: string, v: any) => {
    try {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    } catch {}
  }
};

export const db = {
  init() {
    const meta = Storage.get('iai_meta', { version: 0 });
    if (meta.version < 1) {
      Storage.set('iai_leads', [
        { id: 1, name: "Sardor K.", email: "sardor@gmail.com", country: "UK", visa: "Skilled Worker", status: "New", fee: 1500, date: new Date().toLocaleDateString(), createdAt: nowISO() },
        { id: 2, name: "Malika A.", email: "malika@mail.ru", country: "Germany", visa: "Opportunity Card", status: "Approved", fee: 850, date: new Date(Date.now()-86400000).toLocaleDateString(), createdAt: nowISO() }
      ]);
    }
    // Migration to add createdAt and ensure fee numbers (v2)
    if (meta.version < 2) {
      const leads = Storage.get('iai_leads', []).map((l: any) => ({
        ...l,
        createdAt: l.createdAt || nowISO(),
        fee: typeof l.fee === 'string' ? parseInt(l.fee) || 0 : l.fee
      }));
      Storage.set('iai_leads', leads);
    }
    Storage.set('iai_meta', { version: APP_VERSION, migratedAt: nowISO() });
  },
  getLeads() { return Storage.get('iai_leads', []); },
  saveLeads(leads: Lead[]) { Storage.set('iai_leads', leads); },
  addLead(lead: Partial<Lead>) {
    const leads = db.getLeads();
    const newLead: Lead = {
      id: Date.now(),
      name: lead.name || "Unknown",
      email: lead.email || "",
      country: lead.country || "UK",
      visa: lead.visa || "General",
      status: lead.status || "New",
      fee: typeof lead.fee === 'number' ? lead.fee : parseInt(lead.fee as any) || 0,
      date: lead.date || new Date().toLocaleDateString(),
      createdAt: nowISO()
    };
    db.saveLeads([newLead, ...leads]);
    return newLead;
  },
  setStatus(id: number, status: string) {
    const leads = db.getLeads().map((l: Lead) => l.id === id ? { ...l, status } : l);
    db.saveLeads(leads);
    return leads;
  },
  updateLead(id: number, patch: Partial<Lead>) {
    const leads = db.getLeads().map((l: Lead) => l.id === id ? { ...l, ...patch } : l);
    db.saveLeads(leads);
    return leads.find((l: Lead) => l.id === id);
  },
  deleteLead(id: number) {
    const leads = db.getLeads().filter((l: Lead) => l.id !== id);
    db.saveLeads(leads);
    return leads;
  },
  login(email: string, type: "staff" | "applicant") {
    const name = email?.split('@')[0] || 'Guest';
    const user = type === 'staff'
      ? { name: "Partner Lawyer", role: "staff", email }
      : { name, role: "applicant", email };
    localStorage.setItem("iai_user", JSON.stringify(user));
    return user as User;
  },
  getUser: (): User | null => {
    const u = localStorage.getItem("iai_user");
    return u ? JSON.parse(u) : null;
  },
  logout: () => {
    localStorage.removeItem("iai_user");
  }
};

db.init();