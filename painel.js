
const API_URL = 'https://script.google.com/macros/s/AKfycbzLdoNpdkAZy6I_2Ai_u5zOLPAISAW14yuGp2JFLrdnCLt9AQR7dLCOPQ0NINKh31QJ/exec';

let dadosGlobais = []; 
let dataAtualCalendario = new Date(); 

function extrairNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    
    // Pega o texto e permite apenas números, pontos, vírgulas e sinal de menos
    let limpo = valor.toString().replace(/[^\d.,-]/g, '');
    
    // Se tiver vírgula (padrão Brasil, ex: 1.000,50 ou 99,00)
    if (limpo.includes(',')) {
        // Remove os pontos (se for milhar) e troca a vírgula por ponto para o cálculo
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    }
    
    return parseFloat(limpo) || 0;
}

async function carregarDados() {
    try {
        const response = await fetch(API_URL);
        const dados = await response.json();
        
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
                .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const telefoneCru = item['Whatsapp'] || item['Número de Telefone'] || '';
            let zapLimpo = String(telefoneCru).replace(/\D/g, ''); 
            if (zapLimpo.length === 10 || zapLimpo.length === 11) zapLimpo = '55' + zapLimpo;
            
            // Texto DecoraFest no WhatsApp
            const msgPronta = encodeURIComponent(`Olá ${primeiroNome}, tudo bem? Aqui é da DecoraFest. Sobre a sua reserva do tema ${tema}...`);
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
                        
                        <div id="view-datas-${id}">
                            <span>📅 <strong>Festa:</strong> ${dataFesta}</span>
                            <span style="color: var(--cor-roxo-medio);">📤 <strong>Retirada:</strong> ${dataRetirada}</span>
                            <span>📥 <strong>Devolução:</strong> ${dataEntrega}</span>
                            <button class="btn" style="background-color: transparent; color: var(--cor-roxo-medio); font-size: 0.8rem; padding: 5px; margin-top: 5px; border: 1px solid var(--cor-roxo-medio);" onclick="abrirEdicaoDatas('${id}')">✏️ Editar Datas</button>
                        </div>

                        <div id="edit-datas-${id}" style="display: none; background-color: #f2f2f2; padding: 10px; border-radius: 8px; margin-top: 10px;">
                            <span style="font-size: 0.85rem; font-weight: bold; margin-bottom:5px; display:block;">Novas Datas:</span>
                            <label style="font-size:0.8rem;">Data/Hora da Festa:</label>
                            <input type="datetime-local" id="input-festa-${id}" style="width: 100%; margin-bottom: 5px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                            <label style="font-size:0.8rem;">Retirada:</label>
                            <input type="date" id="input-retirada-${id}" style="width: 100%; margin-bottom: 5px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                            <label style="font-size:0.8rem;">Devolução:</label>
                            <input type="date" id="input-entrega-${id}" style="width: 100%; margin-bottom: 10px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-atualizar" style="flex: 1; padding: 5px;" onclick="salvarNovasDatas('${id}')">💾 Salvar</button>
                                <button class="btn" style="flex: 1; padding: 5px; background-color: #ccc; color: #333;" onclick="fecharEdicaoDatas('${id}')">❌ Cancelar</button>
                            </div>
                        </div>

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
                            <button class="btn btn-pago" onclick="marcarPago('${id}', ${valorTotalNum})">✅ Pago</button>
                            <button class="btn" style="background-color: #4a3b4a; color: white;" onclick="gerarPDF('${id}')">🖨️ PDF</button>
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
        filtrarCartoes();
        renderizarCalendario();

    } catch (error) {
        document.getElementById('painel-container').innerHTML = '<div class="status-msg">Erro ao carregar os dados. Verifique a internet.</div>';
        console.error(error);
    }
}

// ==========================================
// FUNÇÕES DE EDIÇÃO DE DATAS NO CARTÃO
// ==========================================
function abrirEdicaoDatas(id) {
    document.getElementById(`view-datas-${id}`).style.display = 'none';
    document.getElementById(`edit-datas-${id}`).style.display = 'block';
}

function fecharEdicaoDatas(id) {
    document.getElementById(`edit-datas-${id}`).style.display = 'none';
    document.getElementById(`view-datas-${id}`).style.display = 'block';
}

async function salvarNovasDatas(id) {
    const novaFesta = document.getElementById(`input-festa-${id}`).value;
    const novaRetirada = document.getElementById(`input-retirada-${id}`).value;
    const novaEntrega = document.getElementById(`input-entrega-${id}`).value;

    // Se a pessoa clicou em salvar sem preencher nada
    if (!novaFesta && !novaRetirada && !novaEntrega) {
        fecharEdicaoDatas(id);
        return;
    }

    const container = document.getElementById('painel-container');
    container.innerHTML = '<div class="status-msg">Atualizando datas no banco de dados... ⏳</div>';

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                acao: "atualizar_datas",
                id: String(id),
                novaFesta: novaFesta,
                novaRetirada: novaRetirada,
                novaEntrega: novaEntrega
            })
        });
        setTimeout(() => { carregarDados(); }, 1000);
    } catch (error) {
        alert('Erro de conexão ao tentar salvar as datas.');
        carregarDados();
    }
}

// ==========================================
// MOTOR DO CALENDÁRIO VISUAL
// ==========================================
function renderizarCalendario() {
    const ano = dataAtualCalendario.getFullYear();
    const mes = dataAtualCalendario.getMonth(); 

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('mes-ano-display').innerText = `${nomesMeses[mes]} ${ano}`;

    const primeiroDia = new Date(ano, mes, 1).getDay(); 
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate(); 

    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';

    for (let i = 0; i < primeiroDia; i++) {
        grid.innerHTML += `<div class="dia-vazio"></div>`;
    }

    for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
        let temFestaNesseDia = false;
        const dataFormatadaBusca = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        dadosGlobais.forEach(item => {
            if (item['Data da Retirada']) {
                const d = new Date(item['Data da Retirada']);
                if (!isNaN(d.getTime())) {
                    if (d.getUTCFullYear() === ano && d.getUTCMonth() === mes && d.getUTCDate() === dia) {
                        if (item['Status'] !== 'Concluido') temFestaNesseDia = true;
                    }
                }
            }
        });

        const htmlBolinha = temFestaNesseDia ? `<div class="bolinhas-container"><div class="bolinha-evento"></div></div>` : '';
        grid.innerHTML += `<div class="dia-calendario" onclick="clicouNoCalendario('${dataFormatadaBusca}')">${dia}${htmlBolinha}</div>`;
    }
}

function mudarMes(direcao) {
    dataAtualCalendario.setMonth(dataAtualCalendario.getMonth() + direcao);
    renderizarCalendario();
}

function clicouNoCalendario(dataISO) {
    document.getElementById('filtro-data').value = dataISO;
    mudarVisao('lista');
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
        document.getElementById('filtro-nome').value = '';
        document.getElementById('filtro-data').value = '';
        filtrarCartoes(); 
    }
}

// ==========================================
// FILTROS, PLANILHA E LOGIN
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

const SENHA_ACESSO = 'luana123';
function verificarSenha() {
    const senhaDigitada = document.getElementById('senha-input').value;
    if (senhaDigitada === SENHA_ACESSO) {
        // A memória do celular agora salva para a DecoraFest
        localStorage.setItem('auth_decorafest', 'liberado');
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
        localStorage.removeItem('auth_decorafest'); 
        location.reload(); 
    }
}

function iniciarSistema() {
    if (localStorage.getItem('auth_decorafest') === 'liberado') abrirPainel();
}
// ==========================================
// GERAÇÃO DE PDF E IMPRESSÃO (DecoraFest)
// ==========================================
function gerarPDF(idDaReserva) {
    const reserva = dadosGlobais.find(item => item['Submission ID'] == String(idDaReserva));
    if (!reserva) { alert("Erro: Dados da reserva não encontrados."); return; }

    const nomeCompleto = (reserva['Nome - Primeiro Nome'] + ' ' + (reserva['Nome - Ultimo Nome'] || '')).trim();
    const cpf = reserva['CPF'] || 'Não informado';
    const endereco = reserva['Endereço'] || 'Não informado';
    const telefone = reserva['Whatsapp'] || reserva['Número de Telefone'] || 'Não informado';
    const tema = reserva['Tema'] || 'Não informado';
    const pacote = reserva['Tipo do Tema'] || 'Não informado';
    
    const dataFesta = reserva['Data e Hora do Evento'] ? new Date(reserva['Data e Hora do Evento']).toLocaleDateString('pt-BR') : 'Não definida';
    const dataRetirada = reserva['Data da Retirada'] ? new Date(reserva['Data da Retirada']).toLocaleDateString('pt-BR') : 'Não definida';
    const dataEntrega = reserva['Data da Entrega'] ? new Date(reserva['Data da Entrega']).toLocaleDateString('pt-BR') : 'Não definida';
    
    const valorTotal = extrairNumero(reserva['Valor Total']).toFixed(2).replace('.', ',');
    const valorPago = extrairNumero(reserva['Valor Pago']).toFixed(2).replace('.', ',');
    const valorFalta = (extrairNumero(reserva['Valor Total']) - extrairNumero(reserva['Valor Pago'])).toFixed(2).replace('.', ',');

    // --- CORREÇÃO 1: Link direto da imagem ---
    let linkAssinatura = reserva['Assinatura'] || '';
    if (linkAssinatura.includes('drive.google.com')) {
        const match = linkAssinatura.match(/[-\w]{25,}/); // Captura só o ID isolado
        if (match) {
            // Usa o link "thumbnail" do Google, que devolve a imagem pura em vez de uma página
            linkAssinatura = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w800`;
        }
    }

    const htmlDoDocumento = `
        <div class="pdf-header">
            <h1>Ordem de Serviço e Locação</h1>
            <p>DecoraFest - Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>

        <div class="pdf-secao">
            <h3>👤 Dados do Locatário</h3>
            <div class="pdf-linha"><strong>Nome Completo:</strong> <span>${nomeCompleto}</span></div>
            <div class="pdf-linha"><strong>CPF:</strong> <span>${cpf}</span></div>
            <div class="pdf-linha"><strong>Telefone:</strong> <span>${telefone}</span></div>
            <div class="pdf-linha"><strong>Endereço:</strong> <span>${endereco}</span></div>
        </div>

        <div class="pdf-secao">
            <h3>🎈 Detalhes do Evento</h3>
            <div class="pdf-linha"><strong>Tema:</strong> <span>${tema}</span></div>
            <div class="pdf-linha"><strong>Pacote Escolhido:</strong> <span>${pacote}</span></div>
            <div class="pdf-linha"><strong>Data da Festa:</strong> <span>${dataFesta}</span></div>
            <div class="pdf-linha"><strong>Data da Retirada:</strong> <span>${dataRetirada}</span></div>
            <div class="pdf-linha"><strong>Data da Devolução:</strong> <span>${dataEntrega}</span></div>
        </div>

        <div class="pdf-secao">
            <h3>💰 Resumo Financeiro</h3>
            <div class="pdf-linha"><strong>Valor Total:</strong> <span>R$ ${valorTotal}</span></div>
            <div class="pdf-linha"><strong>Sinal Pago:</strong> <span>R$ ${valorPago}</span></div>
            <div class="pdf-linha"><strong>Resta a Pagar:</strong> <span>R$ ${valorFalta}</span></div>
        </div>

        <div class="pdf-assinatura">
            ${linkAssinatura ? `<img src="${linkAssinatura}" style="max-height: 90px; margin-bottom: 5px;" alt="Assinatura Eletrônica">` : '<br><br><br>'}
            <div class="linha-ass"></div>
            <p>Assinatura Eletrônica do Locatário</p>
        </div>
    `;

    document.getElementById('area-impressao').innerHTML = htmlDoDocumento;
    
    // --- CORREÇÃO 2: Dá um tempo para a imagem baixar ---
    // Espera meio segundo (500ms) para garantir que a foto carregou na tela antes de abrir a janela de impressão
    setTimeout(() => {
        window.print();
    }, 500);
}
iniciarSistema();