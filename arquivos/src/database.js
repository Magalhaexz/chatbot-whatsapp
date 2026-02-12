import fs from 'fs';
import path from 'path';
import { sendEmailNotification } from './email.js';
import { exportSingleLeadToExcel } from './excel.js';
import { addLeadToGoogleSheets } from './googleSheets.js';

const DB_PATH = path.join(process.cwd(), 'data', 'leads.json');

// Criar diretório data se não existir
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Inicializar arquivo se não existir
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

export function saveLead(phone, data) {
  try {
    const leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    const lead = {
      id: Date.now(),
      phone: phone,
      ...data,
      created_at: new Date().toISOString()
    };
    
    leads.push(lead);
    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    
    console.log('💾 Lead salvo:', lead.id);

    // Enviar email de notificação (não bloqueia o salvamento)
    sendEmailNotification(lead).catch(err => 
      console.error('⚠️  Erro ao enviar email:', err.message)
    );

    // Exportar para Excel individual (opcional)
    exportSingleLeadToExcel(lead).catch(err => 
      console.log('ℹ️  Excel individual não exportado:', err.message)
    );

    // Adicionar ao Google Sheets (opcional)
    addLeadToGoogleSheets(lead).catch(err => 
      console.log('ℹ️  Google Sheets não atualizado:', err.message)
    );
    
    return lead;
  } catch (error) {
    console.error('❌ Erro ao salvar lead:', error);
    return null;
  }
}

export function getLeads() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (error) {
    console.error('❌ Erro ao ler leads:', error);
    return [];
  }
}

export function getLeadById(id) {
  const leads = getLeads();
  return leads.find(lead => lead.id === id);
}

export function getLeadsByPhone(phone) {
  const leads = getLeads();
  return leads.filter(lead => lead.phone === phone);
}

export function getLeadsStats() {
  const leads = getLeads();
  const today = new Date().toDateString();
  
  return {
    total: leads.length,
    today: leads.filter(l => new Date(l.created_at).toDateString() === today).length,
    thisWeek: leads.filter(l => {
      const leadDate = new Date(l.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return leadDate >= weekAgo;
    }).length,
    thisMonth: leads.filter(l => {
      const leadDate = new Date(l.created_at);
      return leadDate.getMonth() === new Date().getMonth() && 
             leadDate.getFullYear() === new Date().getFullYear();
    }).length
  };
}

export function getTopDestinations(limit = 5) {
  const leads = getLeads();
  const destinations = {};
  
  leads.forEach(lead => {
    if (lead.destino) {
      destinations[lead.destino] = (destinations[lead.destino] || 0) + 1;
    }
  });
  
  return Object.entries(destinations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([destino, count]) => ({ destino, count }));
}

export function getTopTravelTypes() {
  const leads = getLeads();
  const types = {};
  
  leads.forEach(lead => {
    if (lead.tipo_viagem) {
      types[lead.tipo_viagem] = (types[lead.tipo_viagem] || 0) + 1;
    }
  });
  
  return Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, count]) => ({ tipo, count }));
}
