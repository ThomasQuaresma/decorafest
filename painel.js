const API_URL = 'https://script.google.com/macros/s/AKfycbzLdoNpdkAZy6I_2Ai_u5zOLPAISAW14yuGp2JFLrdnCLt9AQR7dLCOPQ0NINKh31QJ/exec';

// ==========================================
// VARIÁVEIS GLOBAIS (Memória do Sistema)
// ==========================================
let dadosGlobais = []; // Guarda as festas para o calendário ler
let dataAtualCalendario = new Date(); // Guarda o mês que o calendário está mostrando

function extrairNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    return parseFloat(valor.toString().replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}

async function carregarDados() {
    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        
        // Salva na memória global para usar no calendário
        dadosGlobais = dados.reverse(); 
        
        const container = document.getElementById('painel-container');
        
        if (dadosGlobais.length === 0) {
            container.innerHTML = '<div class="status-msg">Nenhuma reserva encontrada.</div>';
            return;
        }

        let htmlAtivos = '';
        let htmlConcluidos = '';

        dadosGlobais.forEach((item) => {
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
            const msgPronta = encodeURIComponent(`Olá ${primeiroNome}, tudo bem? Aqui é da Profix (Decorações). Sobre a sua reserva do tema ${tema}...`);
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
            
            if (status === 'Concluido') { htmlConcluidos += cardHTML; } 
            else { htmlAtivos += cardHTML; }
        });

        container.innerHTML = htmlAtivos + htmlConcluidos;
        
        // Atualiza a lista e o calendário ao mesmo tempo
        filtrarCartoes();
        renderizarCalendario();

    } catch (error) {
        document.getElementById('painel-container').innerHTML = '<div class="status-msg">Erro ao carregar os dados. Verifique a internet.</div>';
        console.error(error);
    }
}

// ==========================================
// MOTOR DO CALENDÁRIO VISUAL
// ==========================================
function renderizarCalendario() {
    const ano = dataAtualCalendario.getFullYear();
    const mes = dataAtualCalendario.getMonth(); // Vai de 0 (Jan) a 11 (Dez)

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('mes-ano-display').innerText = `${nomesMeses[mes]} ${ano}`;

    // Descobre em que dia da semana cai o dia 1º (0=Dom, 1=Seg...)
    const primeiroDia = new Date(ano, mes, 1).getDay(); 
    // Descobre o último dia do mês (30, 31, 28...)
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate(); 

    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';

    // 1. Gera os espaços vazios do começo do mês
    for (let i = 0; i < primeiroDia; i++) {
        grid.innerHTML += `<div class="dia-vazio"></div>`;
    }

    // 2. Gera os quadradinhos dos dias
    for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
        
        let temFestaNesseDia = false;
        // Formata o dia para ficar igual ao do filtro (ex: 2026-06-04)
        const dataFormatadaBusca = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        // 3. Procura na memória global se existe alguma festa para este dia exato
        dadosGlobais.forEach(item => {
            if (item['Data da Retirada']) {
                const d = new Date(item['Data da Retirada']);
                if (!isNaN(d.getTime())) {
                    // Usamos UTC para bater exatamente com a data extraída do Google
                    if (d.getUTCFullYear() === ano && d.getUTCMonth() === mes && d.getUTCDate() === dia) {
                        // Se o status NÃO for concluído, bota a bolinha
                        if (item['Status'] !== 'Concluido') {
                            temFestaNesseDia = true;
                        }
                    }
                }
            }
        });

        // Se encontrou festa, desenha a bolinha
        const htmlBolinha = temFestaNesseDia ? `<div class="bolinhas-container"><div class="bolinha-evento"></div></div>` : '';

        // O quadradinho do dia (se clicar, ele chama a função para ver os cartões)
        grid.innerHTML += `
            <div class="dia-calendario" onclick="clicouNoCalendario('${dataFormatadaBusca}')">
                ${dia}
                ${htmlBolinha}
            </div>
        `;
    }
}

function mudarMes(direcao) {
    // Muda para o mês anterior (-1) ou próximo (+1)
    dataAtualCalendario.setMonth(dataAtualCalendario.getMonth() + direcao);
    renderizarCalendario();
}

function clicouNoCalendario(dataISO) {
    // 1. Joga a data selecionada dentro da barra de busca de data
    document.getElementById('filtro-data').value = dataISO;
    // 2. Volta para a visualização da Lista
    mudarVisao('lista');
    // 3. Roda o filtro para esconder os outros cartões
    filtrarCartoes();
}

function mudarVisao(visao) {
    document.getElementById('btn-view-lista').classList.remove('active');
    document.getElementById('btn-view-calendario').classList.remove('active');
    
    if (visao === 'lista') {
        document.getElementById('btn-view-lista').classList.add('active');
        document.getElementById('tela-calendario').style.display = 'none';
        document.getElementById('painel-container').style.display = 'block';
    } else {
        document.getElementById('btn-view-calendario').classList.add('active');
        document.getElementById('tela-calendario').style.display = 'block';
        document.getElementById('painel-container').style.display = 'none';
        
        // Limpa os filtros ao voltar pro calendário
        document.getElementById('filtro-nome').value = '';
        document.getElementById('filtro-data').value = '';
        filtrarCartoes(); 
    }
}

// ==========================================
// FILTROS, PLANILHA E LOGIN (Já existiam)
// ==========================================
function filtrarCartoes() {
    const elementoNome = document.getElementById('filtro-nome');
    if (!elementoNome) return; 
    
    const termoTexto = elementoNome.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const termoData = document.getElementById('filtro-data').value; 
    const cartoes = document.querySelectorAll('.card');
    
    cartoes.forEach(cartao => {
        const textoBusca = cartao.getAttribute('data-busca');
        const dataRetiradaCartao = cartao.getAttribute('data-retirada-iso');
        
        let mostraPorTexto = termoTexto === '' || textoBusca.includes(termoTexto);
        let mostraPorData = termoData === '' || dataRetiradaCartao === termoData;
        
        if (mostraPorTexto && mostraPorData) cartao.style.display = 'flex';
        else cartao.style.display = 'none';
    });
}

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

function marcarPago(id, valorTotal) { if(confirm('Confirmar quitação total desta festa?')) enviarParaPlanilha(id, valorTotal, 0, 'Pago'); }
function marcarConcluido(id) { if(confirm('Deseja marcar esta festa como concluída (itens devolvidos)?')) enviarParaPlanilha(id, null, null, 'Concluido'); }
function resetarPagamento(id, valorTotal) { if(confirm('⚠️ ATENÇÃO: Tem certeza que deseja ZERAR os pagamentos desta festa?')) enviarParaPlanilha(id, 0, valorTotal, 'Pendente'); }

const SENHA_ACESSO = 'profix123';
function verificarSenha() {
    const senhaDigitada = document.getElementById('senha-input').value;
    if (senhaDigitada === SENHA_ACESSO) {
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
    carregarDados(); 
}
function sairPainel() {
    if(confirm('Deseja realmente sair e bloquear o painel?')) {
        localStorage.removeItem('auth_profix'); 
        location.reload(); 
    }
}
function iniciarSistema() {
    if (localStorage.getItem('auth_profix') === 'liberado') abrirPainel();
}

iniciarSistema();