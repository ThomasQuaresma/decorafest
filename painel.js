
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
// GERAÇÃO DE PDF (2 PÁGINAS) AUTOMÁTICO
// ==========================================
function gerarPDF(idDaReserva) {
    const reserva = dadosGlobais.find(item => item['Submission ID'] == String(idDaReserva));
    if (!reserva) { alert("Erro: Dados não encontrados."); return; }

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

    // 1. Prepara a imagem da assinatura com o servidor liberado do Google (lh3)
    let imgAssinaturaHTML = '<br><br><br>';
    let linkAssinatura = reserva['Assinatura'] || '';
    if (linkAssinatura.includes('drive.google.com')) {
        const match = linkAssinatura.match(/[-\w]{25,}/); 
        if (match) {
            // O servidor lh3.googleusercontent.com burla o bloqueio de segurança do PDF
            imgAssinaturaHTML = `<img src="https://lh3.googleusercontent.com/d/${match[0]}" crossorigin="anonymous" style="max-height: 90px; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;" alt="Assinatura">`;
        }
    }

    // 2. Monta o Documento HTML com 2 Páginas
    const elementoContrato = document.createElement('div');
    elementoContrato.style.fontFamily = 'Arial, sans-serif';
    elementoContrato.style.color = '#333';
    elementoContrato.style.lineHeight = '1.6';
    elementoContrato.style.padding = '20px';

    elementoContrato.innerHTML = `
        <!-- ================= PÁGINA 1: O CONTRATO ================= -->
        <div>
            <h1 style="text-align: center; color: #8a2be2;">Contrato de Locação - DecoraFest</h1>
            <hr style="border: 1px solid #eee; margin-bottom: 20px;">
            
            <p style="text-align: justify;">
                Pelo presente instrumento, a <strong>DecoraFest</strong> e o(a) locatário(a) <strong>${nomeCompleto}</strong>, portador(a) do CPF <strong>${cpf}</strong>, têm entre si justo e contratado a locação de artigos para decoração de festas, mediante as seguintes cláusulas e condições:
            </p>
            
            <ul style="text-align: justify; margin-top: 20px; padding-left: 20px;">
                <li style="margin-bottom: 10px;">O locatário declara estar ciente de que o material deve ser devolvido nas exatas mesmas condições em que foi entregue.</li>
                <li style="margin-bottom: 10px;">Em caso de danos, quebras, manchas irreversíveis ou perda de peças, será cobrado o valor integral de reposição do item de acordo com o preço de mercado vigente.</li>
                <li style="margin-bottom: 10px;">O material de locação deve retornar limpo. Caso os itens retornem sujos, será cobrada uma taxa de limpeza no valor de R$ 15,00.</li>
                <li style="margin-bottom: 10px;">Em caso de cancelamento da reserva por parte do locatário, o valor do sinal pago antecipadamente não será reembolsado, cobrindo os custos de bloqueio de agenda.</li>
            </ul>

            <p style="text-align: justify; margin-top: 30px;">
                Por estarem de pleno acordo com as regras estabelecidas, o locatário assina digitalmente este termo de responsabilidade no ato da reserva pelo site.
            </p>

            <div style="text-align: center; margin-top: 80px;">
                ${imgAssinaturaHTML}
                <div style="border-top: 1px solid #000; width: 70%; margin: 0 auto; padding-top: 5px;">
                    <strong>Assinatura Eletrônica do Locatário</strong><br>
                    <span style="font-size: 11px; color: #666;">${nomeCompleto} - CPF: ${cpf}</span><br>
                    <span style="font-size: 10px; color: #999;">Assinado no momento da reserva online</span>
                </div>
            </div>
        </div>

        <!-- ================= QUEBRA DE PÁGINA ================= -->
        <div style="page-break-before: always; margin-top: 40px;"></div>

        <!-- ================= PÁGINA 2: A ORDEM DE SERVIÇO ================= -->
        <div>
            <h1 style="color: #8a2be2; border-bottom: 2px solid #8a2be2; padding-bottom: 10px;">Ordem de Serviço e Detalhes da Locação</h1>

            <h3 style="margin-top: 25px; color: #444;">👤 Dados do Contratante</h3>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #8a2be2;">
                <p style="margin: 5px 0;"><strong>Nome:</strong> ${nomeCompleto}</p>
                <p style="margin: 5px 0;"><strong>Endereço:</strong> ${endereco}</p>
                <p style="margin: 5px 0;"><strong>Telefone/WhatsApp:</strong> ${telefone}</p>
            </div>

            <h3 style="margin-top: 25px; color: #444;">🎈 Detalhes do Evento</h3>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #8a2be2;">
                <p style="margin: 5px 0;"><strong>Tema Selecionado:</strong> ${tema}</p>
                <p style="margin: 5px 0;"><strong>Pacote Escolhido:</strong> ${pacote}</p>
                <p style="margin: 5px 0;"><strong>Data e Hora da Festa:</strong> ${dataFesta}</p>
                <p style="margin: 5px 0;"><strong>Data da Retirada:</strong> ${dataRetirada}</p>
                <p style="margin: 5px 0;"><strong>Data da Devolução:</strong> ${dataEntrega}</p>
            </div>

            <h3 style="margin-top: 25px; color: #444;">💰 Resumo Financeiro</h3>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #8a2be2;">
                <p style="margin: 5px 0; font-size: 16px;"><strong>Valor Total Combinado:</strong> R$ ${valorTotal}</p>
                <p style="margin: 5px 0; font-size: 16px; color: #28a745;"><strong>Sinal Pago Antecipado:</strong> R$ ${valorPago}</p>
                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;">
                <p style="margin: 5px 0; font-size: 18px; color: #d9534f;"><strong>Resta a Pagar:</strong> R$ ${valorFalta}</p>
            </div>
        </div>
    `;

    // 3. Configuração do html2pdf com o novo nome de arquivo
    const nomeArquivoLimpo = nomeCompleto.replace(/\s+/g, '_'); // Troca espaços por underline
    const opt = {
        margin:       10,
        filename:     `Contrato_${nomeArquivoLimpo}_DecoraFest.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 4. Gera o arquivo e baixa automaticamente
    html2pdf().set(opt).from(elementoContrato).save();
}
iniciarSistema();