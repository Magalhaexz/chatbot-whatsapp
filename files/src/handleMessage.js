import { users } from "./users.js";
import { saveLead } from "./database.js";

export function handleMessage(phone, message, client) {
  message = message.trim().toLowerCase();
  
  // Comando para reiniciar conversa
  if (message === 'início' || message === 'inicio' || message === 'reiniciar') {
    delete users[phone];
    return handleMessage(phone, '', client);
  }

  // Iniciar nova conversa
  if (!users[phone]) {
    users[phone] = { 
      step: 1, 
      data: {},
      timestamp: Date.now()
    };
    return `Olá! 👋 Bem-vindo ao *Assistente de Viagens*

Estou aqui para te ajudar a planejar sua próxima viagem! ✈️

*O que você deseja?*
1️⃣ Solicitar Orçamento
2️⃣ Falar com Atendente

_Digite o número da opção desejada_`;
  }

  const user = users[phone];

  switch (user.step) {
    // Etapa 1: Tipo de atendimento
    case 1:
      if (!['1', '2'].includes(message)) {
        return `❌ *Opção inválida*

Por favor, digite:
1️⃣ Solicitar Orçamento
2️⃣ Falar com Atendente`;
      }
      
      user.data.tipo_atendimento = message === '1' ? 'Orçamento' : 'Atendimento Humano';
      
      if (message === '2') {
        // Se escolheu atendimento, finalizar
        const lead = saveLead(phone, {
          ...user.data,
          status: 'Solicitou atendimento humano'
        });
        notifyTeam(client, user.data, phone);
        delete users[phone];
        return `✅ Perfeito!

Um dos nossos especialistas vai te atender em breve! 😊

⏰ Horário de atendimento: Segunda a Sexta, 9h às 18h

_Digite *início* para fazer nova solicitação_`;
      }
      
      user.step = 2;
      return `✈️ *Qual tipo de viagem você procura?*

1️⃣ Somente Aéreo (passagens)
2️⃣ Aéreo + Hotel
3️⃣ Pacote Completo (aéreo + hotel + passeios)

_Digite o número da opção_`;
    
    // Etapa 2: Tipo de viagem
    case 2:
      if (!['1', '2', '3'].includes(message)) {
        return `❌ *Opção inválida*

Digite um número de 1 a 3`;
      }
      
      const tipos = {
        '1': 'Somente Aéreo',
        '2': 'Aéreo + Hotel',
        '3': 'Pacote Completo'
      };
      user.data.tipo_viagem = tipos[message];
      user.step = 3;
      return `🌍 *Para qual destino você deseja viajar?*

Pode ser:
• Cidade (ex: Paris, Miami)
• País (ex: Itália, Japão)
• Região (ex: Europa, Caribe)

_Digite o destino desejado_`;
    
    // Etapa 3: Destino
    case 3:
      if (message.length < 2) {
        return `❌ Por favor, digite um destino válido`;
      }
      user.data.destino = message;
      user.step = 4;
      return `📅 *Em qual período você pretende viajar?*

Exemplos:
• Julho de 2026
• Dezembro
• Entre 15/03 e 22/03

_Digite o período ou mês_`;
    
    // Etapa 4: Período
    case 4:
      user.data.periodo = message;
      user.step = 5;
      return `👥 *Quantas pessoas vão viajar?*

_Digite apenas o número (ex: 2, 4)_`;
    
    // Etapa 5: Número de pessoas
    case 5:
      const numPessoas = parseInt(message);
      if (isNaN(numPessoas) || numPessoas < 1 || numPessoas > 50) {
        return `❌ Digite um número válido entre 1 e 50`;
      }
      user.data.pessoas = numPessoas;
      user.step = 6;
      return `👶 *Qual a idade dos passageiros?*

Exemplos:
• 2 adultos
• 2 adultos e 1 criança de 5 anos
• 4 adultos e 2 crianças (3 e 7 anos)

_Informe as idades_`;
    
    // Etapa 6: Idade dos passageiros
    case 6:
      user.data.idades = message;
      user.step = 7;
      return `💰 *Qual o orçamento total você pretende investir?*

Pode ser uma faixa de valores:
• R$ 10.000
• Até R$ 15.000
• Entre R$ 8.000 e R$ 12.000

_Digite o valor ou faixa_`;
    
    // Etapa 7: Orçamento (finalização)
    case 7:
      user.data.orcamento = message;
      user.data.data_solicitacao = new Date().toLocaleString('pt-BR');
      
      // Salvar lead no banco de dados
      const lead = saveLead(phone, user.data);
      
      // Notificar equipe
      notifyTeam(client, user.data, phone);
      
      // Resumo para o cliente
      const resumo = `✅ *Orçamento solicitado com sucesso!*

━━━━━━━━━━━━━━━━━━━━
📋 *RESUMO DA SOLICITAÇÃO*
━━━━━━━━━━━━━━━━━━━━

🌍 *Destino:* ${user.data.destino}
✈️ *Tipo:* ${user.data.tipo_viagem}
📅 *Período:* ${user.data.periodo}
👥 *Passageiros:* ${user.data.pessoas}
👶 *Idades:* ${user.data.idades}
💰 *Orçamento:* ${user.data.orcamento}

━━━━━━━━━━━━━━━━━━━━

🎯 *Protocolo:* #${lead ? lead.id : 'N/A'}

Um especialista vai analisar sua solicitação e entrar em contato em breve com as melhores opções! 🌟

⏰ Tempo médio de resposta: até 2 horas úteis

_Digite *início* para fazer nova solicitação_`;
      
      // Limpar sessão do usuário
      delete users[phone];
      
      return resumo;
    
    default:
      return `Para começar um novo atendimento, digite *início* 😊`;
  }
}

// Função para notificar a equipe sobre novo lead
async function notifyTeam(client, data, phone) {
  const notifyPhone = process.env.NOTIFY_PHONE;
  
  if (!notifyPhone || !client) return;
  
  const message = `🔔 *NOVO LEAD DE VIAGEM!*

━━━━━━━━━━━━━━━━━━━━
📱 *Cliente:* ${phone}
🌍 *Destino:* ${data.destino}
✈️ *Tipo:* ${data.tipo_viagem}
📅 *Período:* ${data.periodo}
👥 *Passageiros:* ${data.pessoas}
👶 *Idades:* ${data.idades}
💰 *Orçamento:* ${data.orcamento}
🕐 *Data:* ${data.data_solicitacao}
━━━━━━━━━━━━━━━━━━━━

⚡ *Atenda este cliente agora!*`;

  try {
    await client.sendMessage(`${notifyPhone}@c.us`, message);
    console.log('✅ Equipe notificada sobre novo lead');
  } catch (error) {
    console.error('❌ Erro ao notificar equipe:', error.message);
  }
}
