// version_checker.js
const https = require('https');

// --- Configurações ---
const URL_TO_CHECK = 'https://www.bcb.gov.br/api/paginasite/sitebcb/estabilidadefinanceira/scrdoc3040';
const RELEASE_REGEX = /Release\s*(\d{4,})/i;

// A versão esperada VEM dos Secrets/Variáveis de Ambiente do GitHub
const EXPECTED_RELEASE = process.env.EXPECTED_RELEASE; 
const GITHUB_ENV_PATH = process.env.GITHUB_ENV; // Caminho para atualizar a variável para a próxima execução

// Função nativa HTTPS (para obter o conteúdo da página)
function fetchUrlContent(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const { statusCode } = res;
            if (statusCode !== 200) { res.resume(); reject(new Error(`Falha na requisição. Status Code: ${statusCode}`)); return; }
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => { resolve(rawData); });
        }).on('error', (e) => { reject(new Error(`Erro de rede ao aceder ao URL: ${e.message}`)); });
    });
}

async function runChecker() {
    if (!EXPECTED_RELEASE) {
        console.error('ERRO: Variável EXPECTED_RELEASE não definida. Parando.');
        return;
    }
    console.log(`Versão ESPERADA: ${EXPECTED_RELEASE}`);

    let pageContent;
    try {
        pageContent = await fetchUrlContent(URL_TO_CHECK);
    } catch (e) {
        console.error(`ERRO ao obter o URL: ${e.message}`);
        process.exit(1); // Falha a execução
    }

    const match = pageContent.match(RELEASE_REGEX);
    if (!match || match.length < 2) {
        console.error("ERRO: Padrão 'Release ####' não encontrado na página.");
        process.exit(1);
    }

    const currentRelease = match[1];
    console.log(`Versão ATUAL encontrada: ${currentRelease}`);

    if (currentRelease !== EXPECTED_RELEASE) {
        // MUDANÇA DETETADA
        const alarmMessage = `!!! ALARME: Versão do Validador ATUALIZADA! Anterior: ${EXPECTED_RELEASE}, Nova: ${currentRelease}`;
        
        // 1. DISPARAR O ALARME (Usaremos o GitHub Actions para enviar e-mail)
        console.log(`::error::${alarmMessage}`); // Mensagem de erro que será destacada no log
        
        // 2. CORREÇÃO AUTOMÁTICA (Atualizar a Variável de Ambiente para a próxima execução)
        // O GitHub Actions não permite atualizar Secrets de forma fácil/segura,
        // mas podemos atualizar o arquivo GITHUB_ENV para usarmos a nova versão na próxima etapa (e no próximo ciclo).
        
        // Embora a auto-correção via Secrets seja difícil/insegura,
        // o fluxo abaixo garante que o alerta só é enviado UMA VEZ até que o humano atualize o Secret.
        
        // Para simplificar, faremos o seguinte:
        // Se a versão mudar, o script falha (código de saída 1) e o workflow envia o e-mail.

        process.exit(1); // Falha a execução do script para disparar o alarme
        
    } else {
        console.log(`SUCESSO: A Versão Atual (${currentRelease}) corresponde à Versão Esperada.`);
        process.exit(0); // Sucesso
    }
}

runChecker();