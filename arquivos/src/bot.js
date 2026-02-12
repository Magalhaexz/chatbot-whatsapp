import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { handleMessage } from './handleMessage.js';

console.log('🤖 Iniciando Chatbot de Viagens...');

// Criar cliente do WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});
// Gerar QR Code
client.on('qr', (qr) => {
  console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n🔄 Aguardando conexão...\n');
});

// Conectado
client.on('ready', () => {
  console.log('✅ Bot conectado e pronto!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Sistema: ONLINE');
  console.log('⏰ Hora:', new Date().toLocaleString('pt-BR'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Receber mensagens
client.on('message', async (msg) => {
  // Ignorar mensagens de grupos e status
  if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
    return;
  }

  // Ignorar mensagens do próprio bot
  if (msg.fromMe) {
    return;
  }

  const phone = msg.from.replace('@c.us', '');
  const message = msg.body;

  console.log(`\n📩 Mensagem recebida de ${phone}: ${message}`);

  try {
    const response = handleMessage(phone, message, client);
    await msg.reply(response);
    console.log(`✅ Resposta enviada para ${phone}`);
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    await msg.reply('Desculpe, ocorreu um erro. Por favor, tente novamente digitando *início*');
  }
});

// Desconectado
client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);
});

// Erro de autenticação
client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);
});

// Inicializar
client.initialize();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

export default client;
