const API_URL = 'https://script.google.com/macros/s/AKfycbzLdoNpdkAZy6I_2Ai_u5zOLPAISAW14yuGp2JFLrdnCLt9AQR7dLCOPQ0NINKh31QJ/exec';

function extrairNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    return parseFloat(valor.toString().replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}

async function carregarDados() {
    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        
        const container = document.getElementById('painel-container');
        
        if (dados.length === 0) {
            container.innerHTML = '<div class="status-msg">Nenhuma reserva encontrada.</div>';
            return;
        }

        // Criamos duas variáveis para separar os cartões antes de mostrar na tela
        let htmlAtivos = '';
        let htmlConcluidos = '';

        dados.reverse().forEach((item) => {
            const id = item['Submission ID']; 
            if(!id) return; 

            const primeiroNome = item['Nome - Primeiro Nome'] || '';
            const ultimoNome = item['Nome - Ultimo Nome'] || '';
            const nome = (primeiroNome + ' ' + ultimoNome).trim() || 'Cliente não identificado';

            const tema = item['Tema'] || 'Tema não escolhido';
            const pacote = item['Tipo do Tema'] || '';

            const formatarData = (dataBruta) => {
                if (!dataBruta) return 'Não definida';
                const d = new Date(dataBruta);
                if (isNaN(d.getTime())) return dataBruta; 
                
                const dia = String(d.getUTCDate()).padStart(2, '0');
                const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
                const ano = d.getUTCFullYear();
                const horas = String(d.getUTCHours()).padStart(2, '0');
                const minutos = String(d.getUTCMinutes()).padStart(2, '0');
                return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
            };

            const dataFesta = formatarData(item['Data e Hora do Evento']);
            const dataRetirada = formatarData(item['Data da Retirada']);
            const dataEntrega = formatarData(item['Data da Entrega']);

            let dataRetiradaISO = ''; 
            let dataRetiradaBusca = ''; 
            
            if (item['Data da Retirada']) {
                const d = new Date(item['Data da Retirada']);
                if (!isNaN(d.getTime())) {
                    const dia = String(d.getUTCDate()).padStart(2, '0');
                    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const ano = d.getUTCFullYear();
                    dataRetiradaISO = `${ano}-${mes}-${dia}`;
                    dataRetiradaBusca = `${dia}/${mes}/${ano}`;
                }
            }

            const termosBusca = `${nome} ${tema} ${pacote} ${dataRetiradaBusca}`
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const telefoneCru = item['Whatsapp'] || item['Número de Telefone'] || '';
            let zapLimpo = telefoneCru.replace(/\D/g, ''); 
            if (zapLimpo.length === 10 || zapLimpo.length === 11) {
                zapLimpo = '55' + zapLimpo;
            }
            const msgPronta = encodeURIComponent(`Olá ${primeiroNome}, tudo bem? Sobre a sua reserva do tema ${tema}...`);
            let linkZap = zapLimpo ? `https://wa.me/${zapLimpo}?text=${msgPronta}` : '#';
            let estiloBotaoZap = zapLimpo ? 'background-color: #25D366; color: white;' : 'background-color: #ccc; color: #666; pointer-events: none;';

            let valorTotalNum = extrairNumero(item['Valor Total']);
            if (valorTotalNum === 0) {
                if (pacote.includes('Básico')) valorTotalNum = 99;
                else if (pacote.includes('Standard')) valorTotalNum = 129;
                else if (pacote.includes('Premium')) valorTotalNum = 149;
            }
            
            const valorPagoNum = extrairNumero(item['Valor Pago']);
            const valorFaltaNum = valorTotalNum - valorPagoNum;
            let status = item['Status'] || 'Pendente';

            const displayTotal = valorTotalNum.toFixed(2).replace('.', ',');
            const displayFalta = valorFaltaNum.toFixed(2).replace('.', ',');

            const cardHTML = `
                <div class="card" data-status="${status}" data-busca="${termosBusca}" data-retirada-iso="${dataRetiradaISO}">
                    <div class="card-header">
                        <h3>${tema} (${pacote})</h3>
                        <p>👤 ${nome}</p>
                    </div>
                    <div class="card-body">
                        <span>📅 <strong>Festa:</strong> ${dataFesta}</span>
                        <span style="color: var(--cor-roxo-medio);">📤 <strong>Retirada:</strong> ${dataRetirada}</span>
                        <span>📥 <strong>Devolução:</strong> ${dataEntrega}</span>
                        <div class="financeiro">
                            <span style="color: #666;">Total: R$ ${displayTotal}</span>
                            <span style="color: var(--cor-pendente);">Falta: R$ ${displayFalta}</span>
                        </div>
                    </div>
                    <div class="action-area">
                        <div class="input-group">
                            <input type="number" id="input-${id}" placeholder="R$ Valor recebido" min="0.01" step="0.01">
                            <button class="btn btn-atualizar" onclick="adicionarPagamento('${id}', ${valorTotalNum}, ${valorPagoNum})">Atualizar</button>
                        </div>
                        <div class="btn-group" style="margin-top: 5px;">
                            <button class="btn btn-pago" onclick="marcarPago('${id}', ${valorTotalNum})">✅ 100% Pago</button>
                            <button class="btn btn-concluido" onclick="marcarConcluido('${id}')">📦 Finalizar</button>
                            <button class="btn" style="background-color: #ff4d4d; color: white;" onclick="resetarPagamento('${id}', ${valorTotalNum})">🔄 Zerar</button>
                        </div>
                        <div style="margin-top: 5px;">
                            <a href="${linkZap}" target="_blank" class="btn" style="${estiloBotaoZap} display: block; text-decoration: none; text-align: center; font-weight: bold;">
                                📱 Chamar no WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            // SEPARAÇÃO INTELIGENTE
            if (status === 'Concluido') {
                htmlConcluidos += cardHTML; // Guarda na caixa dos finalizados
            } else {
                htmlAtivos += cardHTML; // Guarda na caixa das prioridades
            }
        });

        // Junta tudo e joga na tela (Ativos no topo, Concluídos no final)
        container.innerHTML = htmlAtivos + htmlConcluidos;

        // Reaplica o filtro caso a pessoa já tenha algo digitado na busca
        filtrarCartoes();

    } catch (error) {
        document.getElementById('painel-container').innerHTML = '<div class="status-msg">Erro ao carregar os dados. Verifique a internet.</div>';
        console.error(error);
    }
}

// ==========================================
// MOTOR DE FILTRO E BUSCA
// ==========================================
function filtrarCartoes() {
    const elementoNome = document.getElementById('filtro-nome');
    if (!elementoNome) return; // Proteção extra caso o HTML não esteja carregado
    
    const termoTexto = elementoNome.value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
        
    const termoData = document.getElementById('filtro-data').value; 
    const cartoes = document.querySelectorAll('.card');
    
    cartoes.forEach(cartao => {
        const textoBusca = cartao.getAttribute('data-busca');
        const dataRetiradaCartao = cartao.getAttribute('data-retirada-iso');
        
        let mostraPorTexto = termoTexto === '' || textoBusca.includes(termoTexto);
        let mostraPorData = termoData === '' || dataRetiradaCartao === termoData;
        
        if (mostraPorTexto && mostraPorData) {
            cartao.style.display = 'flex';
        } else {
            cartao.style.display = 'none';
        }
    });
}

// ==========================================
// FUNÇÕES DE COMANDO PARA O GOOGLE SHEETS
// ==========================================
async function enviarParaPlanilha(id, valorPago, falta, status) {
    const container = document.getElementById('painel-container');
    container.innerHTML = '<div class="status-msg">Atualizando banco de dados... ⏳</div>';
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ id: String(id), valorPago: valorPago, falta: falta, status: status })
        });
        setTimeout(() => { carregarDados(); }, 1000);
    } catch (error) {
        alert('Erro de conexão ao tentar salvar.');
        carregarDados();
    }
}

function adicionarPagamento(id, valorTotal, valorJaPago) {
    const input = document.getElementById(`input-${id}`);
    const novoPix = parseFloat(input.value);
    if (isNaN(novoPix) || novoPix <= 0) { alert('❌ Por favor, digite um valor maior que zero.'); return; }
    const faltaAtual = valorTotal - valorJaPago;
    if (novoPix > faltaAtual) { alert(`❌ Valor inválido! O cliente deve apenas R$ ${faltaAtual.toFixed(2).replace('.', ',')}.`); return; }
    const totalPago = valorJaPago + novoPix;
    const faltaFinal = valorTotal - totalPago;
    let status = 'Sinal Pago';
    if (faltaFinal <= 0) status = 'Pago'; 
    enviarParaPlanilha(id, totalPago, faltaFinal, status);
}

function marcarPago(id, valorTotal) {
    if(confirm('Confirmar quitação total desta festa?')) enviarParaPlanilha(id, valorTotal, 0, 'Pago');
}

function marcarConcluido(id) {
    if(confirm('Deseja marcar esta festa como concluída (itens devolvidos)?')) enviarParaPlanilha(id, null, null, 'Concluido');
}

function resetarPagamento(id, valorTotal) {
    if(confirm('⚠️ ATENÇÃO: Tem certeza que deseja ZERAR os pagamentos desta festa?')) enviarParaPlanilha(id, 0, valorTotal, 'Pendente');
}

// ==========================================
// SISTEMA DE SEGURANÇA (LOGIN SIMPLES)
// ==========================================
const SENHA_ACESSO = 'luana123'; // 🔑 

function verificarSenha() {
    const senhaDigitada = document.getElementById('senha-input').value;
    
    if (senhaDigitada === SENHA_ACESSO) {
        // Salva na memória do celular/PC que a pessoa tem acesso
        localStorage.setItem('auth_profix', 'liberado');
        abrirPainel();
    } else {
        alert('❌ Senha incorreta!');
        document.getElementById('senha-input').value = '';
    }
}

function abrirPainel() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('painel-principal').style.display = 'block';
    carregarDados(); // Só puxa os dados do Google DEPOIS que acertar a senha
}

function sairPainel() {
    if(confirm('Deseja realmente sair e bloquear o painel?')) {
        localStorage.removeItem('auth_profix'); // Apaga a memória
        location.reload(); // Recarrega a página para trancar
    }
}

// Quando a página abre, verifica se o celular já estava liberado antes
function iniciarSistema() {
    if (localStorage.getItem('auth_profix') === 'liberado') {
        abrirPainel();
    } else {
        // Deixa a tela de login aparecendo (estado padrão do CSS)
    }
}

// Dá a partida no sistema inteiro
iniciarSistema();