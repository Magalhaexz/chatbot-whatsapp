import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLeads, getLeadById, getLeadsByPhone, getLeadsStats, getTopDestinations, getTopTravelTypes } from './database.js';
import { generateExcelBuffer } from './excel.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Servir arquivos Excel exportados
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

// Rotas da API

// Listar todos os leads
app.get('/api/leads', (req, res) => {
  try {
    const leads = getLeads();
    res.json({
      success: true,
      total: leads.length,
      leads: leads.reverse() // Mais recentes primeiro
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar lead por ID
app.get('/api/leads/:id', (req, res) => {
  try {
    const lead = getLeadById(parseInt(req.params.id));
    if (lead) {
      res.json({ success: true, lead });
    } else {
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar leads por telefone
app.get('/api/leads/phone/:phone', (req, res) => {
  try {
    const leads = getLeadsByPhone(req.params.phone);
    res.json({
      success: true,
      total: leads.length,
      leads: leads.reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estatísticas gerais
app.get('/api/stats', (req, res) => {
  try {
    const stats = getLeadsStats();
    const topDestinations = getTopDestinations();
    const topTravelTypes = getTopTravelTypes();
    
    res.json({ 
      success: true, 
      stats: {
        ...stats,
        topDestinations,
        topTravelTypes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download de todos os leads em Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const leads = getLeads();
    
    if (leads.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nenhum lead encontrado para exportar' 
      });
    }

    const buffer = await generateExcelBuffer(leads);
    
    const filename = `orcamentos-viagens-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    console.log(`📥 Excel baixado: ${filename}`);
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download de leads filtrados por data
app.get('/api/export/excel/date/:startDate/:endDate?', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const allLeads = getLeads();
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const filteredLeads = allLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= start && leadDate <= end;
    });
    
    if (filteredLeads.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nenhum lead encontrado no período especificado' 
      });
    }

    const buffer = await generateExcelBuffer(filteredLeads);
    const filename = `orcamentos-${startDate}-${endDate || 'hoje'}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    console.log(`📥 Excel filtrado baixado: ${filename}`);
  } catch (error) {
    console.error('❌ Erro ao exportar Excel filtrado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Página inicial do painel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌐 Painel Web disponível em: http://localhost:${PORT}`);
  console.log(`📊 API disponível em: http://localhost:${PORT}/api/leads`);
  console.log(`📥 Download Excel: http://localhost:${PORT}/api/export/excel\n`);
});

export default app;
