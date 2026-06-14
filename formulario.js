// A sua URL do Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzLdoNpdkAZy6I_2Ai_u5zOLPAISAW14yuGp2JFLrdnCLt9AQR7dLCOPQ0NINKh31QJ/exec';

const canvas = document.getElementById('canvas-assinatura');
const ctx = canvas.getContext('2d');
let desenhando = false;

// ==========================================
// VALIDAÇÃO E MÁSCARA DE CPF
// ==========================================
function mascaraCPF(e) {
    let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    if (valor.length > 11) valor = valor.slice(0, 11); // Limita a 11 números
    
    // Aplica a formatação (000.000.000-00)
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    e.target.value = valor;
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, ''); // Limpa a formatação
    
    // Verifica se tem 11 dígitos ou se são números repetidos
    if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    // Cálculo do primeiro dígito verificador
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    if (resto != parseInt(cpf.substring(9, 10))) return false;
    
    // Cálculo do segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    if (resto != parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// ==========================================
// CONFIGURAÇÃO E DESENHO NO CANVAS
// ==========================================
function inicializarCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a3b4a'; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function obterPosicao(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function iniciarTraco(e) {
    desenhando = true;
    const pos = obterPosicao(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault(); 
}

function desenharTraco(e) {
    if (!desenhando) return;
    const pos = obterPosicao(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
}

function finalizarTraco() {
    desenhando = false;
}

function limparQuadro() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ==========================================
// ENVIO PARA O GOOGLE DRIVE E PLANILHA
// ==========================================
async function processarEnvio(e) {
    e.preventDefault();

    // 🔴 1. VERIFICA O CPF ANTES DE TUDO 🔴
    const cpfDigitado = document.getElementById('form-cpf').value;
    if (!validarCPF(cpfDigitado)) {
        alert('❌ O CPF informado é inválido. Por favor, verifique os números e tente novamente.');
        document.getElementById('form-cpf').focus(); // Coloca o cursor de volta no CPF
        return; // Impede o envio do formulário
    }

    const assinaturaBase64 = canvas.toDataURL('image/png');
    
    let temaFinal = document.getElementById('form-tema').value;
    if (temaFinal === 'Outros') temaFinal = document.getElementById('form-tema-outro').value;

    let valorFinal = document.getElementById('form-valor-total').value;
    if (valorFinal === 'Outros') valorFinal = document.getElementById('form-valor-outro').value;

    const dadosFormulario = {
        acao: "nova_reserva",
        nome: document.getElementById('form-nome').value,
        cpf: cpfDigitado,
        telefone: document.getElementById('form-telefone').value,
        endereco: document.getElementById('form-endereco').value,
        tema: temaFinal, 
        pacote: document.getElementById('form-pacote').value,
        dataFesta: document.getElementById('form-data-festa').value,
        dataRetirada: document.getElementById('form-data-retirada').value,
        dataDevolucao: document.getElementById('form-data-devolucao').value,
        valorTotal: valorFinal,
        assinaturaBase64: assinaturaBase64
    };

    const botaoSubmit = document.getElementById('btn-enviar-reserva');
    botaoSubmit.innerText = "Processando Contrato... ⏳";
    botaoSubmit.disabled = true;

    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(dadosFormulario)
        });
        
        const resultado = await resposta.json();

        if (resultado.sucesso) {
            alert('🎉 Perfeito! A sua reserva foi enviada com sucesso e o contrato assinado eletronicamente.');
            
            document.getElementById('form-reserva').reset();
            limparQuadro();
            
            document.getElementById('form-tema-outro').style.display = 'none';
            document.getElementById('form-valor-outro').style.display = 'none';
            
        } else {
            alert('❌ Erro no processamento: ' + resultado.erro);
        }
    } catch (erro) {
        alert('❌ Erro de ligação ao enviar os dados.');
        console.error(erro);
    } finally {
        botaoSubmit.innerText = "Finalizar Reserva e Aceitar Contrato";
        botaoSubmit.disabled = false;
    }
}

// ==========================================
// INICIALIZAÇÃO DE EVENTOS
// ==========================================
window.addEventListener('load', () => {
    inicializarCanvas();
    
    // Ouvinte para a máscara de CPF (dispara sempre que o cliente digita algo)
    document.getElementById('form-cpf').addEventListener('input', mascaraCPF);
    
    // Ouvintes da Assinatura
    canvas.addEventListener('mousedown', iniciarTraco);
    canvas.addEventListener('mousemove', desenharTraco);
    window.addEventListener('mouseup', finalizarTraco);
    canvas.addEventListener('touchstart', iniciarTraco);
    canvas.addEventListener('touchmove', desenharTraco);
    canvas.addEventListener('touchend', finalizarTraco);

    // Ouvintes de Botões
    document.getElementById('btn-limpar-assinatura').addEventListener('click', limparQuadro);
    document.getElementById('form-reserva').addEventListener('submit', processarEnvio);

    // Lógica para mostrar/esconder o campo "Outros" do Tema
    const selectTema = document.getElementById('form-tema');
    const inputTemaOutro = document.getElementById('form-tema-outro');
    
    selectTema.addEventListener('change', (e) => {
        if (e.target.value === 'Outros') {
            inputTemaOutro.style.display = 'block';
            inputTemaOutro.required = true;
        } else {
            inputTemaOutro.style.display = 'none';
            inputTemaOutro.required = false;
        }
    });

    // Lógica para mostrar/esconder o campo "Outros" do Valor Total
    const selectValor = document.getElementById('form-valor-total');
    const inputValorOutro = document.getElementById('form-valor-outro');
    
    selectValor.addEventListener('change', (e) => {
        if (e.target.value === 'Outros') {
            inputValorOutro.style.display = 'block';
            inputValorOutro.required = true;
        } else {
            inputValorOutro.style.display = 'none';
            inputValorOutro.required = false;
        }
    });
});

window.addEventListener('resize', inicializarCanvas);