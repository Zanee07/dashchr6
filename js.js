// ==========================================
// SISTEMA DE LOGIN
// ==========================================
const EMAIL_CORRETO = 'cuchavaempreiteira@gmail.com';
const SENHA_CORRETA = 'cuchava@1030';

// Verificar se já está logado ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  if (isLoggedIn === 'true') {
    mostrarDashboard();
  }
});

// Evento de submit do formulário de login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const email = emailInput.value.trim();
    const senha = passwordInput.value;

    if (email === EMAIL_CORRETO && senha === SENHA_CORRETA) {
      // Login correto
      localStorage.setItem('isLoggedIn', 'true');
      mostrarDashboard();
    } else {
      // Email ou senha incorretos
      errorDiv.style.display = 'block';
      passwordInput.value = '';
      emailInput.focus();

      // Ocultar erro após 3 segundos
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 3000);
    }
  });
}

function mostrarDashboard() {
  const loginScreen = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard');

  // Fade out da tela de login
  loginScreen.style.transition = 'opacity 0.3s ease';
  loginScreen.style.opacity = '0';

  setTimeout(() => {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';

    // Inicializar o dashboard
    inicializarDashboard();
  }, 300);
}

function inicializarDashboard() {
  // Carrega os nomes personalizados das seções
  carregarNomePersonalizado();
  carregarNomePersonalizadoCheckout();
  carregarNomePersonalizadoCustom();
  carregarNomePersonalizadoLink4();
  carregarNomePersonalizadoLink5();
  carregarNomePersonalizadoLink6();

  // Carrega os dados do dashboard
  carregarStats();

  // Atualiza automaticamente a cada 5 segundos
  setInterval(carregarStats, 5000);
}

function logout() {
  // Remove o login do localStorage
  localStorage.removeItem('isLoggedIn');

  // Recarrega a página para mostrar a tela de login
  window.location.reload();
}

// ==========================================
// CÓDIGO ORIGINAL DO DASHBOARD
// ==========================================
const SUPABASE_URL = 'https://owiweuvfgvphkonktzsr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aXdldXZmZ3ZwaGtvbmt0enNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NzYwNTYsImV4cCI6MjA3NDA1MjA1Nn0.xXbxSu_wm4vRH7XeqoJHXl8FXuTQgG20BOqwnOtKHHc';
const CLIENT_ID = 'cliente6';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🎯 PLANO PRO: Limite de cliques
const LIMITE_CLIQUES_PLANO_PRO = 10000;
let popupUpgradeJaMostrado = false;
let limiteAtingido = false;

let filtroAtual = 'total';
let filtroLinkAtual = 'todos'; // Novo: filtro de links personalizados
let todosOsCliques = [];
let todasAsVendas = [];
let todosOsCheckouts = []; // ← NOVO: armazena cliques no checkout
let chartHorarios = null;
let linksRastreados = []; // Armazena os 3 links personalizados do banco

// 🕐 IMPORTANTE: O banco de dados salva timestamps JÁ EM HORÁRIO DE BRASÍLIA
// Não é necessário fazer conversão de timezone aqui, apenas ler diretamente

const CODIGOS_ORIGEM = {
  'ti': 'instagram',
  'tt': 'tiktok',
  'ty': 'youtube',
  'tl': 'linkedin',
  'tw': 'whatsapp',
  'tp': 'trafego-pago',
  'tx': 'twitter',
  'th': 'threads'
};

// 🚀 FUNÇÕES DO PLANO PRO
function verificarLimiteCliques(totalCliques) {
  const cliquesRestantes = LIMITE_CLIQUES_PLANO_PRO - totalCliques;
  const counterElement = document.getElementById('clicks-restantes');
  const planCounterElement = document.getElementById('plan-counter');

  // Atualiza o contador visual
  if (counterElement && planCounterElement) {
    counterElement.textContent = Math.max(0, cliquesRestantes);

    // Remove classes anteriores
    planCounterElement.classList.remove('warning', 'limit-reached');

    // Adiciona classes baseado no número de cliques restantes
    if (cliquesRestantes <= 0) {
      planCounterElement.classList.add('limit-reached');
      counterElement.textContent = '0';
      planCounterElement.innerHTML = '🔒 Limite atingido! <span class="clicks-count">Faça upgrade</span>';
    } else if (cliquesRestantes <= 10) {
      planCounterElement.classList.add('warning');
    }
  }

  if (totalCliques >= LIMITE_CLIQUES_PLANO_PRO) {
    limiteAtingido = true;

    // Mostra o popup apenas uma vez
    if (!popupUpgradeJaMostrado) {
      mostrarPopupUpgrade();
      popupUpgradeJaMostrado = true;
    }

    // Bloqueia todas as funcionalidades
    bloquearFuncionalidades();
    return true;
  }
  return false;
}

function mostrarPopupUpgrade() {
  const popup = document.getElementById('upgrade-popup');
  if (popup) {
    popup.style.display = 'flex';
  }
}

function fecharPopupUpgrade() {
  const popup = document.getElementById('upgrade-popup');
  if (popup) {
    popup.style.display = 'none';
  }
}

function bloquearFuncionalidades() {
  // Desabilita todos os botões de ação
  const botoesAcao = document.querySelectorAll('.button, .filter-btn');
  botoesAcao.forEach(botao => {
    botao.disabled = true;
    botao.style.opacity = '0.5';
    botao.style.cursor = 'not-allowed';
  });

  // Adiciona overlay de bloqueio nos cards (exceto Instagram)
  const cardsParaBloquear = ['.tiktok', '.youtube', '.linkedin', '.whatsapp', '.total'];
  cardsParaBloquear.forEach(selector => {
    const card = document.querySelector(`.stat-card${selector}`);
    if (card) {
      card.classList.add('locked');
    }
  });

  // Bloqueia a seção de geolocalização
  const geoSection = document.getElementById('geo-section');
  if (geoSection && !geoSection.classList.contains('locked-section')) {
    geoSection.classList.add('locked-section');

    // Cria o overlay de bloqueio
    const overlay = document.createElement('div');
    overlay.className = 'section-lock-overlay';
    overlay.innerHTML = `
      <div class="lock-content">
        <div class="lock-icon">🔒</div>
        <div class="lock-text">Plano Pro</div>
        <a href="https://wa.me/5547880479880?text=Olá!%20Atingi%20o%20limite%20do%20Plano%20Pro%20e%20gostaria%20de%20renovar" target="_blank" class="lock-upgrade-btn">
          💬 Renovar Plano
        </a>
      </div>
    `;
    geoSection.insertBefore(overlay, geoSection.firstChild);
  }

  // Mostra mensagem de bloqueio
  mostrarAlerta('🔒 Limite de cliques atingido! Faça upgrade para continuar.', 'error');
}

// 🔗 GERENCIAMENTO DE LINKS RASTREADOS
async function inicializarLinksRastreados() {
  try {
    // Busca links existentes do cliente
    const { data: links, error: linksError } = await supabase
      .from('links_rastreados')
      .select('*')
      .eq('client_id', CLIENT_ID)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (linksError) throw linksError;

    // Se não tem links, cria os 6 padrões (PLANO PRO)
    if (!links || links.length === 0) {
      const linksDefault = [
        { id: 'link1', client_id: CLIENT_ID, nome: 'Link 1', url_destino: '', icone: '📱', ordem: 1, ativo: true },
        { id: 'link2', client_id: CLIENT_ID, nome: 'Link 2', url_destino: '', icone: '🛒', ordem: 2, ativo: true },
        { id: 'link3', client_id: CLIENT_ID, nome: 'Link 3', url_destino: '', icone: '🔗', ordem: 3, ativo: true },
        { id: 'link4', client_id: CLIENT_ID, nome: 'Link 4', url_destino: '', icone: '🎯', ordem: 4, ativo: true },
        { id: 'link5', client_id: CLIENT_ID, nome: 'Link 5', url_destino: '', icone: '💎', ordem: 5, ativo: true },
        { id: 'link6', client_id: CLIENT_ID, nome: 'Link 6', url_destino: '', icone: '⭐', ordem: 6, ativo: true }
      ];

      const { error: insertError } = await supabase
        .from('links_rastreados')
        .insert(linksDefault);

      if (insertError) throw insertError;

      linksRastreados = linksDefault;
    } else {
      linksRastreados = links;
    }

    // Carrega nomes personalizados do localStorage (migração)
    const nome1 = localStorage.getItem('links_section_title');
    const nome2 = localStorage.getItem('checkout_section_title');
    const nome3 = localStorage.getItem('custom_section_title');
    const nome4 = localStorage.getItem('link4_section_title');
    const nome5 = localStorage.getItem('link5_section_title');
    const nome6 = localStorage.getItem('link6_section_title');

    // Atualiza no banco se houver nomes personalizados
    if (nome1 || nome2 || nome3 || nome4 || nome5 || nome6) {
      const updates = [];
      if (nome1) updates.push({ id: 'link1', nome: nome1 });
      if (nome2) updates.push({ id: 'link2', nome: nome2 });
      if (nome3) updates.push({ id: 'link3', nome: nome3 });
      if (nome4) updates.push({ id: 'link4', nome: nome4 });
      if (nome5) updates.push({ id: 'link5', nome: nome5 });
      if (nome6) updates.push({ id: 'link6', nome: nome6 });

      for (const update of updates) {
        await supabase
          .from('links_rastreados')
          .update({ nome: update.nome, updated_at: new Date() })
          .eq('id', update.id)
          .eq('client_id', CLIENT_ID);
      }

      // Recarrega
      const { data: reloaded } = await supabase
        .from('links_rastreados')
        .select('*')
        .eq('client_id', CLIENT_ID)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      linksRastreados = reloaded || linksRastreados;
    }

    // Atualiza interface com nomes do banco
    atualizarNomesFiltros();

  } catch (error) {
    console.error('Erro ao inicializar links rastreados:', error);
  }
}

function atualizarNomesFiltros() {
  linksRastreados.forEach(link => {
    const filterTextElement = document.getElementById(`filter-${link.id}-text`);
    if (filterTextElement) {
      filterTextElement.textContent = link.nome;
    }
  });
}

// 💾 FUNÇÃO PARA SALVAR URL NO BANCO DE DADOS
async function salvarUrlLink(linkId) {
  const inputIds = {
    'link1': 'base-url',
    'link2': 'checkout-url',
    'link3': 'custom-url',
    'link4': 'link4-url',
    'link5': 'link5-url',
    'link6': 'link6-url'
  };

  const inputId = inputIds[linkId];
  if (!inputId) {
    mostrarAlerta('❌ Link inválido!', 'error');
    return;
  }

  const inputElement = document.getElementById(inputId);
  const urlDestino = inputElement.value.trim();

  // Se estiver vazio, permite salvar (limpar o link)
  if (urlDestino) {
    // Validação básica de URL apenas se tiver conteúdo
    try {
      new URL(urlDestino);
    } catch (e) {
      mostrarAlerta('⚠️ URL inválida! Use formato: https://exemplo.com', 'error');
      inputElement.focus();
      return;
    }
  }

  try {
    // Atualiza no banco de dados (permite null/vazio)
    const { error } = await supabase
      .from('links_rastreados')
      .update({
        url_destino: urlDestino || null,
        updated_at: new Date()
      })
      .eq('id', linkId)
      .eq('client_id', CLIENT_ID);

    if (error) throw error;

    // Atualiza o array local
    const linkIndex = linksRastreados.findIndex(l => l.id === linkId);
    if (linkIndex !== -1) {
      linksRastreados[linkIndex].url_destino = urlDestino || null;
    }

    if (urlDestino) {
      mostrarAlerta('✅ URL salva com sucesso!', 'success');
    } else {
      mostrarAlerta('✅ Link removido com sucesso!', 'success');
    }

    // Mostra indicador de URL salva
    mostrarIndicadorUrlSalva(linkId);

    // Mostra/oculta o botão de gerar código
    const btnGerarCodigoMap = {
      'link1': 'btn-gerar-codigo',
      'link2': 'btn-gerar-codigo-link2',
      'link3': 'btn-gerar-codigo-link3',
      'link4': 'btn-gerar-codigo-link4',
      'link5': 'btn-gerar-codigo-link5',
      'link6': 'btn-gerar-codigo-link6'
    };

    const btnGerarCodigo = document.getElementById(btnGerarCodigoMap[linkId]);
    if (btnGerarCodigo) {
      btnGerarCodigo.style.display = urlDestino ? 'block' : 'none';
    }
  } catch (e) {
    console.error('Erro ao salvar URL:', e);
    mostrarAlerta('❌ Erro ao salvar URL', 'error');
  }
}

// 📥 FUNÇÃO PARA CARREGAR URLs SALVAS DO BANCO
async function carregarUrlsSalvas() {
  linksRastreados.forEach(link => {
    if (link.url_destino) {
      // Mapeia linkId para inputId
      const inputIds = {
        'link1': 'base-url',
        'link2': 'checkout-url',
        'link3': 'custom-url',
        'link4': 'link4-url',
        'link5': 'link5-url',
        'link6': 'link6-url'
      };

      const inputId = inputIds[link.id];
      if (inputId) {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
          inputElement.value = link.url_destino;

          // Dispara o evento de input para atualizar os links
          const event = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(event);

          // Mostra indicadores de URL salva
          mostrarIndicadorUrlSalva(link.id);
        }
      }
    }
  });
}

// 📝 FUNÇÃO PARA EDITAR URL SALVA
function editarUrlLink(linkId) {
  const inputIds = {
    'link1': 'base-url',
    'link2': 'checkout-url',
    'link3': 'custom-url',
    'link4': 'link4-url',
    'link5': 'link5-url',
    'link6': 'link6-url'
  };

  const inputId = inputIds[linkId];
  if (!inputId) return;

  const inputElement = document.getElementById(inputId);
  if (!inputElement) return;

  // Habilita o campo para edição
  inputElement.removeAttribute('readonly');
  inputElement.style.backgroundColor = '#ffffff';
  inputElement.style.cursor = 'text';
  inputElement.focus();
  inputElement.select();

  // Esconde o botão editar
  const btnEditar = document.getElementById(`btn-editar-url-${linkId}`);
  if (btnEditar) btnEditar.style.display = 'none';

  // Esconde o indicador de salva
  const indicador = document.getElementById(`url-salva-${linkId}`);
  if (indicador) indicador.style.display = 'none';

  // Mostra mensagem
  mostrarAlerta('✏️ Edite a URL e clique em Salvar', 'success');
}

// ✓ FUNÇÃO PARA MOSTRAR INDICADOR DE URL SALVA
function mostrarIndicadorUrlSalva(linkId) {
  // Mostra o indicador "✓ Salva"
  const indicador = document.getElementById(`url-salva-${linkId}`);
  if (indicador) {
    indicador.style.display = 'inline';
  }

  // Mostra botão de editar
  const btnEditar = document.getElementById(`btn-editar-url-${linkId}`);
  if (btnEditar) {
    btnEditar.style.display = 'inline-block';
  }

  // Torna o campo readonly (só pode editar clicando em Editar)
  const inputIds = {
    'link1': 'base-url',
    'link2': 'checkout-url',
    'link3': 'custom-url',
    'link4': 'link4-url',
    'link5': 'link5-url',
    'link6': 'link6-url'
  };

  const inputId = inputIds[linkId];
  const inputElement = document.getElementById(inputId);
  if (inputElement) {
    inputElement.setAttribute('readonly', 'true');
    inputElement.style.backgroundColor = '#f8f9fa';
    inputElement.style.cursor = 'not-allowed';
  }
}

async function carregarStats() {
  try {
    // Inicializa links rastreados primeiro
    await inicializarLinksRastreados();

    // 📥 Carrega URLs salvas do banco
    await carregarUrlsSalvas();

    // 📊 Busca cliques (com limite de 10 mil)
    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('origem, timestamp, pais, estado, cidade, latitude, longitude, metodo_geolocalizacao, link_id')
      .eq('client_id', CLIENT_ID)
      .order('timestamp', { ascending: false })
      .limit(10000);

    if (clicksError) throw clicksError;

    // 🛒 Busca cliques no checkout (NOVO!)
    const { data: checkouts, error: checkoutsError } = await supabase
      .from('checkout_clicks')
      .select('origem, timestamp, link_id')
      .eq('client_id', CLIENT_ID)
      .order('timestamp', { ascending: false })
      .limit(10000);

    if (checkoutsError) {
      console.warn('Aviso ao buscar checkouts:', checkoutsError);
    }

    // 💰 Busca vendas (com limite de 10 mil)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('origem, timestamp, valor, link_id')
      .eq('client_id', CLIENT_ID)
      .order('timestamp', { ascending: false })
      .limit(10000);

    if (salesError) {
      console.warn('Aviso ao buscar vendas:', salesError);
    }

    todosOsCliques = clicks || [];
    todosOsCheckouts = checkouts || []; // ← NOVO
    todasAsVendas = sales || [];

    atualizarDashboard();
    atualizarResumoGeral();
    atualizarGraficoHorarios();
    atualizarGeolocalizacao();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    const agora = new Date().toLocaleTimeString('pt-BR');
    document.getElementById('last-update').textContent = `Última atualização: ${agora}`;

  } catch (error) {
    console.error('Erro ao carregar stats:', error);
    document.getElementById('loading').textContent = '❌ Erro ao carregar dados. Verifique o console.';
    mostrarAlerta('❌ Erro ao carregar dados', 'error');
  }
}

function filtrarCliques(periodo) {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  return todosOsCliques.filter(click => {
    // Timestamp já vem em horário de Brasília do banco
    const dataClick = new Date(click.timestamp);

    // 🔗 Filtro por link personalizado
    if (filtroLinkAtual !== 'todos') {
      if (click.link_id !== filtroLinkAtual) {
        return false;
      }
    }

    // 📅 Filtro por período
    switch(periodo) {
      case 'hoje':
        return dataClick >= hoje;
      case 'ontem':
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        return dataClick >= ontem && dataClick < hoje;
      case '7dias':
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        return dataClick >= semanaAtras;
      case '30dias':
        const mesAtras = new Date(hoje);
        mesAtras.setDate(mesAtras.getDate() - 30);
        return dataClick >= mesAtras;
      case 'total':
      default:
        return true;
    }
  });
}

// ← NOVO: Função para filtrar checkouts
function filtrarCheckouts(periodo) {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  return todosOsCheckouts.filter(checkout => {
    // Timestamp já vem em horário de Brasília do banco
    const dataCheckout = new Date(checkout.timestamp);

    // 🔗 Filtro por link personalizado
    if (filtroLinkAtual !== 'todos') {
      if (checkout.link_id !== filtroLinkAtual) {
        return false;
      }
    }

    // 📅 Filtro por período
    switch(periodo) {
      case 'hoje':
        return dataCheckout >= hoje;
      case 'ontem':
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        return dataCheckout >= ontem && dataCheckout < hoje;
      case '7dias':
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        return dataCheckout >= semanaAtras;
      case '30dias':
        const mesAtras = new Date(hoje);
        mesAtras.setDate(mesAtras.getDate() - 30);
        return dataCheckout >= mesAtras;
      case 'total':
      default:
        return true;
    }
  });
}

function filtrarVendas(periodo) {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  return todasAsVendas.filter(venda => {
    // Timestamp já vem em horário de Brasília do banco
    const dataVenda = new Date(venda.timestamp);

    // 🔗 Filtro por link personalizado
    if (filtroLinkAtual !== 'todos') {
      if (venda.link_id !== filtroLinkAtual) {
        return false;
      }
    }

    // 📅 Filtro por período
    switch(periodo) {
      case 'hoje':
        return dataVenda >= hoje;
      case 'ontem':
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        return dataVenda >= ontem && dataVenda < hoje;
      case '7dias':
        const semanaAtras = new Date(hoje);
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        return dataVenda >= semanaAtras;
      case '30dias':
        const mesAtras = new Date(hoje);
        mesAtras.setDate(mesAtras.getDate() - 30);
        return dataVenda >= mesAtras;
      case 'total':
      default:
        return true;
    }
  });
}

function calcularTaxaConversao(cliques, vendas) {
  if (cliques === 0) return 0;
  return ((vendas / cliques) * 100).toFixed(1);
}

function atualizarDashboard() {
  const clickesFiltrados = filtrarCliques(filtroAtual);
  const checkoutsFiltrados = filtrarCheckouts(filtroAtual); // ← NOVO
  const vendasFiltradas = filtrarVendas(filtroAtual);

  const origens = ['instagram', 'tiktok', 'youtube', 'linkedin', 'whatsapp', 'trafego-pago', 'twitter', 'threads', 'gmb'];
  let totalCliques = 0;
  let totalCheckouts = 0; // ← NOVO
  let totalVendas = 0;
  let valorTotalGeral = 0;

  origens.forEach(origem => {
    // Cliques na página
    const cliques = clickesFiltrados.filter(c => c.origem === origem).length;
    animarNumero(`clicks-${origem}`, cliques);
    totalCliques += cliques;

    // ← NOVO: Cliques no checkout
    const checkouts = checkoutsFiltrados.filter(c => c.origem === origem).length;
    animarNumero(`checkout-${origem}`, checkouts);
    totalCheckouts += checkouts;

    // Vendas
    const vendas = vendasFiltradas.filter(v => v.origem === origem).length;
    animarNumero(`sales-${origem}`, vendas);
    totalVendas += vendas;

    // Valor total
    const valorTotal = vendasFiltradas
      .filter(v => v.origem === origem)
      .reduce((total, venda) => total + (parseFloat(venda.valor) || 0), 0);
    
    valorTotalGeral += valorTotal;

    const valorElement = document.getElementById(`valor-${origem}`);
    if (valorElement) {
      valorElement.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    }

    // Taxa de conversão (vendas / checkouts)
    const taxa = calcularTaxaConversao(checkouts, vendas);
    const conversionElement = document.getElementById(`conversion-${origem}`);
    if (conversionElement) {
      conversionElement.textContent = `📊 Taxa: ${taxa}%`;
    }
  });

  // Totais
  animarNumero('clicks-total', totalCliques);
  animarNumero('checkout-total', totalCheckouts); // ← NOVO
  animarNumero('sales-total', totalVendas);
  
  const valorTotalElement = document.getElementById('valor-total');
  if (valorTotalElement) {
    valorTotalElement.textContent = `R$ ${valorTotalGeral.toFixed(2).replace('.', ',')}`;
  }

  const taxaTotal = calcularTaxaConversao(totalCheckouts, totalVendas);
  const conversionTotalElement = document.getElementById('conversion-total');
  if (conversionTotalElement) {
    conversionTotalElement.textContent = `📊 Taxa: ${taxaTotal}%`;
  }

  // Labels de período
  const labelPeriodo = {
    'hoje': 'Hoje',
    'ontem': 'Ontem',
    '7dias': 'Últimos 7 dias',
    '30dias': 'Últimos 30 dias',
    'total': 'Todo o período'
  };

  const label = labelPeriodo[filtroAtual];
  document.getElementById('period-label-ig').textContent = label;
  document.getElementById('period-label-tt').textContent = label;
  document.getElementById('period-label-yt').textContent = label;
  document.getElementById('period-label-li').textContent = label;
  document.getElementById('period-label-wa').textContent = label;
  document.getElementById('period-label-tp').textContent = label;
  document.getElementById('period-label-tx').textContent = label;
  document.getElementById('period-label-th').textContent = label;
  document.getElementById('period-label-gmb').textContent = label;
  document.getElementById('period-label-total').textContent = label;

  // 🎯 VERIFICA LIMITE DE CLIQUES DO PLANO GRATUITO
  // Conta TODOS os cliques do Instagram (total geral, não apenas período filtrado)
  const totalCliquesInstagram = todosOsCliques.filter(c => c.origem === 'instagram').length;
  verificarLimiteCliques(totalCliquesInstagram);
}

function atualizarResumoGeral() {
  const hoje = filtrarCliques('hoje').length;
  const ontem = filtrarCliques('ontem').length;
  const semana = filtrarCliques('7dias').length;
  const mes = filtrarCliques('30dias').length;
  const total = filtrarCliques('total').length; // ← Agora respeita o filtro de link

  document.getElementById('total-hoje').textContent = hoje;
  document.getElementById('total-ontem').textContent = ontem;
  document.getElementById('total-7dias').textContent = semana;
  document.getElementById('total-30dias').textContent = mes;
  document.getElementById('total-geral').textContent = total;
}

function atualizarGraficoHorarios() {
  const clickesFiltrados = filtrarCliques(filtroAtual);

  const horarios = Array(24).fill(0);
  clickesFiltrados.forEach(click => {
    // Timestamp já vem em horário de Brasília
    const hora = new Date(click.timestamp).getHours();
    horarios[hora]++;
  });

  const ctx = document.getElementById('horariosChart').getContext('2d');
  
  if (chartHorarios) {
    chartHorarios.destroy();
  }

  chartHorarios = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}h`),
      datasets: [{
        label: 'Cliques por Hora',
        data: horarios,
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} clique${context.parsed.y !== 1 ? 's' : ''}`;
            }
          }
        }
      }
    }
  });
}

// 🌍 FUNÇÃO MELHORADA: Geolocalização com tratamento de null e estatísticas
function atualizarGeolocalizacao() {
  const clickesFiltrados = filtrarCliques(filtroAtual);
  
  const localizacoes = {};
  let cliquesComGeo = 0;
  let cliquesSemGeo = 0;
  let cliquesGPS = 0;
  let cliquesIP = 0;
  
  clickesFiltrados.forEach(click => {
    // Conta estatísticas de método
    if (click.metodo_geolocalizacao === 'gps') {
      cliquesGPS++;
    } else if (click.metodo_geolocalizacao === 'ip') {
      cliquesIP++;
    }
    
    // Verifica se tem cidade, estado E pais (todos preenchidos)
    if (click.cidade && click.estado && click.pais) {
      const key = `${click.cidade}, ${click.estado} - ${click.pais}`;
      localizacoes[key] = (localizacoes[key] || 0) + 1;
      cliquesComGeo++;
    } else {
      cliquesSemGeo++;
    }
  });

  const localizacoesOrdenadas = Object.entries(localizacoes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const geoList = document.getElementById('geo-list');
  geoList.innerHTML = '';

  if (localizacoesOrdenadas.length === 0) {
    geoList.innerHTML = `
      <p style="color: #666; text-align: center; width: 100%; padding: 20px;">
        Nenhum dado de localização disponível ainda. 
        Os dados aparecerão assim que houver cliques rastreados.
      </p>
    `;
    return;
  }

  // Mostra localizações
  localizacoesOrdenadas.forEach(([local, count]) => {
    const item = document.createElement('div');
    item.className = 'geo-item';
    item.innerHTML = `
      <div class="flag">🌍</div>
      <div class="info">
        <div class="location">${local}</div>
        <div class="count">${count} clique${count > 1 ? 's' : ''}</div>
      </div>
    `;
    geoList.appendChild(item);
  });
  
  // 📊 Mostra estatísticas de precisão
  if (cliquesGPS > 0 || cliquesIP > 0) {
    const stats = document.createElement('div');
    stats.style.cssText = 'margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; font-size: 13px; color: #666;';
    stats.innerHTML = `
      <div style="margin-bottom: 8px;"><strong>📊 Estatísticas de Precisão:</strong></div>
      ${cliquesGPS > 0 ? `<div>🎯 GPS (preciso): ${cliquesGPS} clique${cliquesGPS > 1 ? 's' : ''}</div>` : ''}
      ${cliquesIP > 0 ? `<div>⚠️ IP (aproximado): ${cliquesIP} clique${cliquesIP > 1 ? 's' : ''}</div>` : ''}
      ${cliquesSemGeo > 0 ? `<div style="color: #999; margin-top: 5px;">💡 ${cliquesSemGeo} sem localização</div>` : ''}
    `;
    geoList.appendChild(stats);
  }
}

function filtrarPeriodo(periodo) {
  filtroAtual = periodo;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  atualizarDashboard();
  atualizarGraficoHorarios();
  atualizarGeolocalizacao();
  atualizarResumoGeral();
}

// Função para filtrar por link personalizado
function filtrarPorLink(link) {
  filtroLinkAtual = link;

  // Remove active de todos os botões
  document.querySelectorAll('.filter-btn-link').forEach(btn => {
    btn.classList.remove('active');
  });

  // Encontra o botão correto e adiciona active
  // Usa closest para garantir que pega o botão mesmo se clicar no span interno
  let targetButton = event.target;
  if (!targetButton.classList.contains('filter-btn-link')) {
    targetButton = event.target.closest('.filter-btn-link');
  }

  if (targetButton) {
    targetButton.classList.add('active');
  }

  // 🔗 Aplica a filtragem em TODAS as seções
  atualizarDashboard();
  atualizarGraficoHorarios();
  atualizarGeolocalizacao();
  atualizarResumoGeral();

  // Mostra mensagem de confirmação
  const linkNome = link === 'todos' ? 'Todos os Links' : (linksRastreados.find(l => l.id === link)?.nome || link);
  mostrarAlerta(`🔗 Filtrando por: ${linkNome}`, 'success');
}

function animarNumero(elementId, novoValor) {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;
  
  const valorAtual = parseInt(elemento.textContent || '0');
  
  if (valorAtual === novoValor) return;
  
  elemento.style.transform = 'scale(1.2)';
  elemento.textContent = novoValor;
  
  setTimeout(() => {
    elemento.style.transform = 'scale(1)';
  }, 200);
}

function atualizarStats() {
  carregarStats();
  mostrarAlerta('✅ Dados atualizados!', 'success');
}

// Função para atualizar os links conforme o usuário digita
function atualizarLinks() {
  const baseUrl = document.getElementById('base-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'tl',
    'whatsapp': 'tw',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th',
    'gmb': 'gmb'
  };

  // Se não há URL, mostra mensagem padrão e oculta botão
  if (!baseUrl) {
    Object.keys(codigosPlataforma).forEach(plataforma => {
      document.getElementById(`link-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    btnGerarCodigo.style.display = 'none';
    return;
  }

  // Mostra o botão de gerar código
  btnGerarCodigo.style.display = 'block';

  // Atualiza cada link com a URL base + código da plataforma + link_id
  Object.entries(codigosPlataforma).forEach(([plataforma, codigo]) => {
    const separador = baseUrl.includes('?') ? '&' : '?';
    const linkCompleto = `${baseUrl}${separador}origem=${codigo}&link_id=link1`;
    document.getElementById(`link-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLink(plataforma) {
  const linkElement = document.getElementById(`link-${plataforma}`);
  const link = linkElement.textContent;

  // Verifica se há um link válido
  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL do seu site primeiro!', 'error');
    document.getElementById('base-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

// Função para atualizar os links de checkout conforme o usuário digita
function atualizarLinksCheckout() {
  const checkoutUrl = document.getElementById('checkout-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo-link2');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'li',
    'whatsapp': 'wa',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th'
  };

  const plataformas = ['instagram', 'tiktok', 'youtube', 'linkedin', 'whatsapp', 'trafego-pago', 'twitter', 'threads', 'gmb'];

  // Se não há URL, mostra mensagem padrão e oculta botão
  if (!checkoutUrl) {
    plataformas.forEach(plataforma => {
      document.getElementById(`link-checkout-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    if (btnGerarCodigo) btnGerarCodigo.style.display = 'none';
    return;
  }

  // Mostra o botão de gerar código
  if (btnGerarCodigo) btnGerarCodigo.style.display = 'block';

  // Verifica se já tem parâmetros na URL
  const separador = checkoutUrl.includes('?') ? '&' : '?';

  // Atualiza cada link com a URL base + origem + link_id
  plataformas.forEach(plataforma => {
    const linkCompleto = `${checkoutUrl}${separador}origem=${codigosPlataforma[plataforma]}&link_id=link2`;
    document.getElementById(`link-checkout-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLinkCheckout(plataforma) {
  const linkElement = document.getElementById(`link-checkout-${plataforma}`);
  const link = linkElement.textContent;

  // Verifica se há um link válido
  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL do seu checkout primeiro!', 'error');

    // Abre a seção se estiver fechada
    const checkoutContent = document.getElementById('checkout-content');
    const checkoutBtn = document.getElementById('checkout-toggle-btn');
    if (checkoutContent.classList.contains('collapsed')) {
      checkoutContent.classList.remove('collapsed');
      checkoutBtn.classList.remove('collapsed');
      checkoutBtn.textContent = '▼';
    }

    document.getElementById('checkout-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link de checkout do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mostrarAlerta(mensagem, tipo) {
  const alert = document.createElement('div');
  alert.className = 'alert';
  alert.textContent = mensagem;
  alert.style.background = tipo === 'success' ? '#4CAF50' : '#ff4757';
  alert.style.color = 'white';

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 2000);
}

function toggleCheckoutSection() {
  const content = document.getElementById('checkout-content');
  const btn = document.getElementById('checkout-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecaoCheckout(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('checkout-section-title');
  const textoAtual = titleElement.textContent;

  // Cria um input temporário
  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  // Substitui o span pelo input
  titleElement.replaceWith(input);
  input.focus();
  input.select();

  // Função para salvar
  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    // Recria o span
    const novoSpan = document.createElement('span');
    novoSpan.id = 'checkout-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecaoCheckout()');

    input.replaceWith(novoSpan);

    // Salva no banco de dados
    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link2')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      // Atualiza o array local
      const linkIndex = linksRastreados.findIndex(l => l.id === 'link2');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      // Atualiza também o nome do filtro
      atualizarNomeFiltro('link2', novoTexto);

      // Atualiza localStorage (migração)
      localStorage.setItem('checkout_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  // Eventos
  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

function carregarNomePersonalizadoCheckout() {
  try {
    const nomePersonalizado = localStorage.getItem('checkout_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('checkout-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    // Atualiza também o filtro
    atualizarNomeFiltro('link2', nomePersonalizado || 'Link 2');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado checkout:', e);
  }
}

function toggleResumoSection() {
  const content = document.getElementById('resumo-content');
  const btn = document.getElementById('resumo-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

function toggleLinksSection() {
  const content = document.getElementById('links-content');
  const btn = document.getElementById('links-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecao(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('links-section-title');
  const textoAtual = titleElement.textContent;

  // Cria um input temporário
  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  // Substitui o span pelo input
  titleElement.replaceWith(input);
  input.focus();
  input.select();

  // Função para salvar
  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    // Recria o span
    const novoSpan = document.createElement('span');
    novoSpan.id = 'links-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecao()');

    input.replaceWith(novoSpan);

    // Salva no banco de dados
    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link1')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      // Atualiza o array local
      const linkIndex = linksRastreados.findIndex(l => l.id === 'link1');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      // Atualiza também o nome do filtro
      atualizarNomeFiltro('link1', novoTexto);

      // Atualiza localStorage (migração)
      localStorage.setItem('links_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  // Eventos
  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

// Carrega o nome personalizado ao iniciar
function carregarNomePersonalizado() {
  try {
    const nomePersonalizado = localStorage.getItem('links_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('links-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    // Atualiza também o filtro
    atualizarNomeFiltro('link1', nomePersonalizado || 'Link 1');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado:', e);
  }
}

// Atualiza o nome do filtro de link
function atualizarNomeFiltro(linkId, novoNome) {
  const filterTextElement = document.getElementById(`filter-${linkId}-text`);
  if (filterTextElement) {
    filterTextElement.textContent = novoNome;
  }
}

// ========================================
// FUNÇÕES DA SEÇÃO CUSTOM (NOVA)
// ========================================

function toggleCustomSection() {
  const content = document.getElementById('custom-content');
  const btn = document.getElementById('custom-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecaoCustom(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('custom-section-title');
  const textoAtual = titleElement.textContent;

  // Cria um input temporário
  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  // Substitui o span pelo input
  titleElement.replaceWith(input);
  input.focus();
  input.select();

  // Função para salvar
  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    // Recria o span
    const novoSpan = document.createElement('span');
    novoSpan.id = 'custom-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecaoCustom()');

    input.replaceWith(novoSpan);

    // Salva no banco de dados
    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link3')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      // Atualiza o array local
      const linkIndex = linksRastreados.findIndex(l => l.id === 'link3');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      // Atualiza também o nome do filtro
      atualizarNomeFiltro('link3', novoTexto);

      // Atualiza localStorage (migração)
      localStorage.setItem('custom_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  // Eventos
  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

function carregarNomePersonalizadoCustom() {
  try {
    const nomePersonalizado = localStorage.getItem('custom_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('custom-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    // Atualiza também o filtro
    atualizarNomeFiltro('link3', nomePersonalizado || 'Link 3');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado custom:', e);
  }
}

function atualizarLinksCustom() {
  const customUrl = document.getElementById('custom-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo-link3');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'tl',
    'whatsapp': 'tw',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th',
    'gmb': 'gmb'
  };

  // Se não há URL, mostra mensagem padrão e oculta botão
  if (!customUrl) {
    Object.keys(codigosPlataforma).forEach(plataforma => {
      document.getElementById(`link-custom-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    if (btnGerarCodigo) btnGerarCodigo.style.display = 'none';
    return;
  }

  // Mostra o botão de gerar código
  if (btnGerarCodigo) btnGerarCodigo.style.display = 'block';

  // Verifica se já tem parâmetros na URL
  const separador = customUrl.includes('?') ? '&' : '?';

  // Atualiza cada link com a URL base + código + link_id
  Object.entries(codigosPlataforma).forEach(([plataforma, codigo]) => {
    const linkCompleto = `${customUrl}${separador}origem=${codigo}&link_id=link3`;
    document.getElementById(`link-custom-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLinkCustom(plataforma) {
  const linkElement = document.getElementById(`link-custom-${plataforma}`);
  const link = linkElement.textContent;

  // Verifica se há um link válido
  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL primeiro!', 'error');

    // Abre a seção se estiver fechada
    const customContent = document.getElementById('custom-content');
    const customBtn = document.getElementById('custom-toggle-btn');
    if (customContent.classList.contains('collapsed')) {
      customContent.classList.remove('collapsed');
      customBtn.classList.remove('collapsed');
      customBtn.textContent = '▼';
    }

    document.getElementById('custom-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link personalizado do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

// ========================================
// GERADOR DE CÓDIGO DE TRACKING
// ========================================

function gerarCodigoTracking(linkId = 'link1') {
  // Mapeia o linkId para o campo de input correto
  const inputMap = {
    'link1': 'base-url',
    'link2': 'checkout-url',
    'link3': 'custom-url',
    'link4': 'link4-url',
    'link5': 'link5-url',
    'link6': 'link6-url'
  };

  const inputId = inputMap[linkId] || 'base-url';
  const baseUrl = document.getElementById(inputId).value.trim();

  if (!baseUrl) {
    mostrarAlerta('⚠️ Por favor, insira a URL do seu site primeiro!', 'error');
    return;
  }

  // Lê o template do tracking-code.html
  const codigoTemplate = `<!-- ========================================
     CODIGO DE TRACKING - PLANO PRO
     Com limite de 10.000 cliques
     URL Rastreada: ${baseUrl}
     ======================================== -->

<!-- Biblioteca do Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Estilos do Popup de Cookies -->
<style>
  .cookie-banner {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    max-width: 500px;
    width: 90%;
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 99999;
    opacity: 0;
    animation: slideUpFade 0.4s 0.5s forwards;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  @keyframes slideUpFade {
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .cookie-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .cookie-icon { font-size: 28px; }
  .cookie-title { font-size: 18px; font-weight: 700; color: #1a202c; }
  .cookie-text { font-size: 14px; color: #4a5568; line-height: 1.6; margin-bottom: 18px; }
  .cookie-link { color: #667eea; text-decoration: none; font-weight: 600; }
  .cookie-link:hover { text-decoration: underline; }
  .cookie-buttons { display: flex; gap: 10px; }
  .cookie-btn { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .cookie-btn-accept { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
  .cookie-btn-accept:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
  .cookie-btn-decline { background: #f7fafc; color: #718096; border: 2px solid #e2e8f0; }
  .cookie-btn-decline:hover { background: #edf2f7; }

  @media (max-width: 600px) {
    .cookie-banner { bottom: 0; left: 0; right: 0; width: 100%; max-width: 100%; border-radius: 16px 16px 0 0; transform: translateX(0) translateY(20px); }
    @keyframes slideUpFade { to { opacity: 1; transform: translateX(0) translateY(0); } }
    .cookie-buttons { flex-direction: column; }
  }

  /* Popup de Limite Atingido */
  .limite-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .limite-popup-content {
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .limite-popup-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }

  .limite-popup h2 {
    font-size: 24px;
    color: #1a202c;
    margin-bottom: 15px;
  }

  .limite-popup p {
    font-size: 16px;
    color: #4a5568;
    line-height: 1.6;
    margin-bottom: 25px;
  }

  .limite-popup-btn {
    display: inline-block;
    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
    color: white;
    padding: 15px 30px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.2s;
  }

  .limite-popup-btn:hover {
    transform: translateY(-2px);
  }
</style>

<!-- Script de Tracking -->
<script>
  const SUPABASE_URL = 'https://owiweuvfgvphkonktzsr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aXdldXZmZ3ZwaGtvbmt0enNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NzYwNTYsImV4cCI6MjA3NDA1MjA1Nn0.xXbxSu_wm4vRH7XeqoJHXl8FXuTQgG20BOqwnOtKHHc';
  const CLIENT_ID = '${CLIENT_ID}';
  const LIMITE_CLIQUES = 10000;
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const CODIGOS_ORIGEM = { 'ti': 'instagram', 'tt': 'tiktok', 'ty': 'youtube', 'tl': 'linkedin', 'tw': 'whatsapp', 'tp': 'trafego-pago', 'tx': 'twitter', 'th': 'threads' };
  let origemAtual = null;
  let linkIdAtual = null;
  let limiteAtingido = false;

  function gerarCheckoutId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return \`ck_\${timestamp}_\${random}\`;
  }

  // 🕐 Retorna timestamp no horário de Brasília (sem timezone)
  function getTimestampBrasilia() {
    const agora = new Date();
    // Converte para formato ISO de Brasília (sem offset)
    const brasiliaStr = agora.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    // sv-SE retorna formato: "2025-12-11 20:24:00"
    return brasiliaStr.replace(' ', 'T'); // Retorna: 2025-12-11T20:24:00
  }

  async function verificarLimite() {
    try {
      const { count, error } = await supabase.from('clicks').select('*', { count: 'exact', head: true }).eq('client_id', CLIENT_ID);
      if (error) throw error;
      console.log(\`Cliques totais: \${count}/\${LIMITE_CLIQUES}\`);
      if (count >= LIMITE_CLIQUES) {
        limiteAtingido = true;
        console.log('LIMITE ATINGIDO!');
        mostrarPopupLimite();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  function mostrarPopupLimite() {
    // Cria o popup apenas uma vez
    if (document.getElementById('limite-popup-overlay')) return;

    const popup = document.createElement('div');
    popup.id = 'limite-popup-overlay';
    popup.className = 'limite-popup';
    popup.style.display = 'flex';
    popup.innerHTML = \`
      <div class="limite-popup-content">
        <div class="limite-popup-icon">🚀</div>
        <h2>Limite de Cliques Atingido!</h2>
        <p>
          O limite de <strong>10.000 cliques</strong> do Plano Pro foi atingido.<br>
          Entre em contato com o suporte para renovar seu plano.
        </p>
        <a href="https://wa.me/5547880479880?text=Olá!%20Atingi%20o%20limite%20do%20Plano%20Pro%20e%20gostaria%20de%20renovar"
           target="_blank"
           class="limite-popup-btn">
          💬 Chamar no WhatsApp
        </a>
      </div>
    \`;
    document.body.appendChild(popup);
  }

  function mostrarBannerCookies() {
    return new Promise((resolve) => {
      try {
        const saved = localStorage.getItem('cookies_accepted');
        if (saved) { resolve(saved === 'true'); return; }
      } catch (e) { resolve(false); return; }
      const banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.innerHTML = \`<div class="cookie-header"><div class="cookie-icon">&#x1F36A;</div><div class="cookie-title">Cookies e Privacidade</div></div><div class="cookie-text">Usamos cookies para melhorar sua experiencia. <a href="#" class="cookie-link">Saiba mais</a></div><div class="cookie-buttons"><button class="cookie-btn cookie-btn-decline" id="cookie-decline">Rejeitar</button><button class="cookie-btn cookie-btn-accept" id="cookie-accept">&#x2713; Aceitar</button></div>\`;
      document.body.appendChild(banner);
      const timeout = setTimeout(() => { banner.remove(); resolve(false); }, 10000);
      document.getElementById('cookie-accept').addEventListener('click', () => {
        clearTimeout(timeout);
        try { localStorage.setItem('cookies_accepted', 'true'); } catch (e) {}
        banner.style.animation = 'slideUpFade 0.3s reverse forwards';
        setTimeout(() => banner.remove(), 300);
        resolve(true);
      });
      document.getElementById('cookie-decline').addEventListener('click', () => {
        clearTimeout(timeout);
        try { localStorage.setItem('cookies_accepted', 'false'); } catch (e) {}
        banner.style.animation = 'slideUpFade 0.3s reverse forwards';
        setTimeout(() => banner.remove(), 300);
        resolve(false);
      });
    });
  }

  async function obterGeolocalizacaoGPS() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&accept-language=pt-BR\`);
          const data = await response.json();
          resolve({ pais: data.address.country || null, estado: data.address.state || null, cidade: data.address.city || data.address.town || data.address.village || null, ip: null, metodo: 'gps', latitude: lat, longitude: lng });
        } catch (error) { resolve(null); }
      }, () => resolve(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  }

  async function obterGeolocalizacaoIP() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return { pais: data.country_name || null, estado: data.region || null, cidade: data.city || null, ip: data.ip || null, metodo: 'ip', latitude: data.latitude, longitude: data.longitude };
    } catch (error) {
      return { pais: null, estado: null, cidade: null, ip: null, metodo: 'falhou', latitude: null, longitude: null };
    }
  }

  async function obterGeolocalizacao() {
    const aceitouCookies = await mostrarBannerCookies();
    if (aceitouCookies) {
      const geoGPS = await obterGeolocalizacaoGPS();
      if (geoGPS) return geoGPS;
    }
    return await obterGeolocalizacaoIP();
  }

  async function registrarClique(origem, linkId) {
    try {
      const atingiuLimite = await verificarLimite();
      if (atingiuLimite) { console.log('Limite atingido!'); return false; }
      const chave = \`tracking_clique_\${origem}_\${linkId || 'default'}\`;
      if (sessionStorage.getItem(chave)) { console.log('Ja registrado'); return false; }
      console.log(\`Registrando: \${origem} (Link: \${linkId || 'N/A'})\`);
      const geo = await obterGeolocalizacao();
      const timestampBrasilia = getTimestampBrasilia();
      const { error } = await supabase.from('clicks').insert([{ origem, client_id: CLIENT_ID, link_id: linkId, timestamp: timestampBrasilia, pais: geo.pais, estado: geo.estado, cidade: geo.cidade, ip: geo.ip, latitude: geo.latitude, longitude: geo.longitude, metodo_geolocalizacao: geo.metodo }]);
      if (!error) {
        console.log('Registrado!');
        sessionStorage.setItem(chave, 'true');
        await verificarLimite();
        return true;
      }
      return false;
    } catch (error) { console.error('Erro:', error); return false; }
  }

  async function registrarCheckoutClick(origem, linkId) {
    try {
      if (limiteAtingido) { console.log('Limite atingido!'); return null; }
      const chave = \`tracking_checkout_\${origem}_\${linkId || 'default'}\`;
      if (sessionStorage.getItem(chave)) return sessionStorage.getItem(\`checkout_id_\${origem}_\${linkId || 'default'}\`);
      const checkoutId = gerarCheckoutId();
      const timestampBrasilia = getTimestampBrasilia();
      console.log(\`Checkout ID: \${checkoutId} (Link: \${linkId || 'N/A'})\`);
      const { error } = await supabase.from('checkout_clicks').insert([{ checkout_id: checkoutId, origem, client_id: CLIENT_ID, link_id: linkId, timestamp: timestampBrasilia }]);
      if (!error) {
        console.log(\`Checkout registrado: \${checkoutId}\`);
        sessionStorage.setItem(chave, 'true');
        sessionStorage.setItem(\`checkout_id_\${origem}_\${linkId || 'default'}\`, checkoutId);
        return checkoutId;
      }
      return null;
    } catch (error) { console.error('Erro:', error); return null; }
  }

  function interceptarBotoes(origem, linkId) {
    console.log('Interceptando...');
    document.addEventListener('click', function(e) {
      if (limiteAtingido) return;
      let elemento = e.target;
      let tentativas = 0;
      while (elemento && tentativas < 5) {
        const checkoutUrl = elemento.getAttribute('data-checkout-url');
        if (checkoutUrl && checkoutUrl !== 'whatsapp' && origem) {
          registrarCheckoutClick(origem, linkId).then(checkoutId => {
            if (checkoutId && elemento.tagName === 'A') {
              try {
                const url = new URL(elemento.href);
                url.searchParams.set('checkout_id', checkoutId);
                elemento.href = url.toString();
              } catch (e) {}
            }
          });
          break;
        }
        if (elemento.href && origem) {
          registrarCheckoutClick(origem, linkId);
          break;
        }
        elemento = elemento.parentElement;
        tentativas++;
      }
    }, true);
  }

  async function inicializarTracking() {
    console.log('Tracking iniciado - Plano Pro');
    await verificarLimite();
    if (limiteAtingido) { console.log('Limite atingido'); return; }
    const urlParams = new URLSearchParams(window.location.search);
    let origem = null;
    let linkId = null;

    // Captura origem
    const origemParam = urlParams.get('origem');
    if (origemParam && CODIGOS_ORIGEM[origemParam]) {
      origem = CODIGOS_ORIGEM[origemParam];
      console.log(\`Origem: \${origem}\`);
    }

    // Captura link_id
    linkId = urlParams.get('link_id');

    if (origem) {
      origemAtual = origem;
      linkIdAtual = linkId;
      console.log(\`Link ID: \${linkId || 'N/A'}\`);
      const registrado = await registrarClique(origem, linkId);
      if (registrado) interceptarBotoes(origem, linkId);
    } else {
      console.log('Plano Pro - Use: ?origem=ti&link_id=link1 (Instagram), ?origem=tt&link_id=link1 (TikTok), etc.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTracking);
  } else {
    inicializarTracking();
  }

  if (typeof window !== 'undefined') {
    window.origemAtual = origemAtual;
    window.linkIdAtual = linkIdAtual;
    window.registrarCheckoutClick = registrarCheckoutClick;
    window.verificarLimite = verificarLimite;
  }
</script>`;

  // Mostra o código no modal
  document.getElementById('codigo-tracking').textContent = codigoTemplate;
  document.getElementById('modal-codigo').style.display = 'flex';
}

function fecharModalCodigo() {
  document.getElementById('modal-codigo').style.display = 'none';
}

// Fecha modal ao clicar fora
document.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-codigo');
  if (e.target === modal) {
    fecharModalCodigo();
  }
});

function copiarCodigoTracking() {
  const codigo = document.getElementById('codigo-tracking').textContent;

  navigator.clipboard.writeText(codigo).then(() => {
    mostrarAlerta('✅ Código copiado! Cole antes do </body> da sua página.', 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

function baixarCodigoTracking() {
  const codigo = document.getElementById('codigo-tracking').textContent;
  const blob = new Blob([codigo], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'codigo-tracking.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  mostrarAlerta('✅ Arquivo baixado! Abra com Bloco de Notas.', 'success');
}

// ========================================
// FUNÇÕES PARA LINK 4
// ========================================

function toggleLink4Section() {
  const content = document.getElementById('link4-content');
  const btn = document.getElementById('link4-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecaoLink4(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('link4-section-title');
  const textoAtual = titleElement.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  titleElement.replaceWith(input);
  input.focus();
  input.select();

  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    const novoSpan = document.createElement('span');
    novoSpan.id = 'link4-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecaoLink4()');

    input.replaceWith(novoSpan);

    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link4')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      const linkIndex = linksRastreados.findIndex(l => l.id === 'link4');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      atualizarNomeFiltro('link4', novoTexto);
      localStorage.setItem('link4_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

function carregarNomePersonalizadoLink4() {
  try {
    const nomePersonalizado = localStorage.getItem('link4_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('link4-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    atualizarNomeFiltro('link4', nomePersonalizado || 'Link 4');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado link4:', e);
  }
}

function atualizarLinksLink4() {
  const link4Url = document.getElementById('link4-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo-link4');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'tl',
    'whatsapp': 'tw',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th',
    'gmb': 'gmb'
  };

  if (!link4Url) {
    Object.keys(codigosPlataforma).forEach(plataforma => {
      document.getElementById(`link-link4-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    if (btnGerarCodigo) btnGerarCodigo.style.display = 'none';
    return;
  }

  if (btnGerarCodigo) btnGerarCodigo.style.display = 'block';

  const separador = link4Url.includes('?') ? '&' : '?';

  Object.entries(codigosPlataforma).forEach(([plataforma, codigo]) => {
    const linkCompleto = `${link4Url}${separador}origem=${codigo}&link_id=link4`;
    document.getElementById(`link-link4-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLinkLink4(plataforma) {
  const linkElement = document.getElementById(`link-link4-${plataforma}`);
  const link = linkElement.textContent;

  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL primeiro!', 'error');

    const link4Content = document.getElementById('link4-content');
    const link4Btn = document.getElementById('link4-toggle-btn');
    if (link4Content.classList.contains('collapsed')) {
      link4Content.classList.remove('collapsed');
      link4Btn.classList.remove('collapsed');
      link4Btn.textContent = '▼';
    }

    document.getElementById('link4-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link 4 do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

// ========================================
// FUNÇÕES PARA LINK 5
// ========================================

function toggleLink5Section() {
  const content = document.getElementById('link5-content');
  const btn = document.getElementById('link5-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecaoLink5(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('link5-section-title');
  const textoAtual = titleElement.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  titleElement.replaceWith(input);
  input.focus();
  input.select();

  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    const novoSpan = document.createElement('span');
    novoSpan.id = 'link5-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecaoLink5()');

    input.replaceWith(novoSpan);

    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link5')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      const linkIndex = linksRastreados.findIndex(l => l.id === 'link5');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      atualizarNomeFiltro('link5', novoTexto);
      localStorage.setItem('link5_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

function carregarNomePersonalizadoLink5() {
  try {
    const nomePersonalizado = localStorage.getItem('link5_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('link5-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    atualizarNomeFiltro('link5', nomePersonalizado || 'Link 5');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado link5:', e);
  }
}

function atualizarLinksLink5() {
  const link5Url = document.getElementById('link5-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo-link5');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'tl',
    'whatsapp': 'tw',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th',
    'gmb': 'gmb'
  };

  if (!link5Url) {
    Object.keys(codigosPlataforma).forEach(plataforma => {
      document.getElementById(`link-link5-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    if (btnGerarCodigo) btnGerarCodigo.style.display = 'none';
    return;
  }

  if (btnGerarCodigo) btnGerarCodigo.style.display = 'block';

  const separador = link5Url.includes('?') ? '&' : '?';

  Object.entries(codigosPlataforma).forEach(([plataforma, codigo]) => {
    const linkCompleto = `${link5Url}${separador}origem=${codigo}&link_id=link5`;
    document.getElementById(`link-link5-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLinkLink5(plataforma) {
  const linkElement = document.getElementById(`link-link5-${plataforma}`);
  const link = linkElement.textContent;

  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL primeiro!', 'error');

    const link5Content = document.getElementById('link5-content');
    const link5Btn = document.getElementById('link5-toggle-btn');
    if (link5Content.classList.contains('collapsed')) {
      link5Content.classList.remove('collapsed');
      link5Btn.classList.remove('collapsed');
      link5Btn.textContent = '▼';
    }

    document.getElementById('link5-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link 5 do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

// ========================================
// FUNÇÕES PARA LINK 6
// ========================================

function toggleLink6Section() {
  const content = document.getElementById('link6-content');
  const btn = document.getElementById('link6-toggle-btn');

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
    btn.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
    btn.textContent = '▶';
  }
}

async function editarNomeSecaoLink6(event) {
  if (event) {
    event.stopPropagation();
  }

  const titleElement = document.getElementById('link6-section-title');
  const textoAtual = titleElement.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoAtual;
  input.style.cssText = 'font-size: inherit; font-weight: inherit; padding: 5px 10px; border: 2px solid #667eea; border-radius: 8px; outline: none; font-family: inherit; width: 400px; max-width: 90%;';

  titleElement.replaceWith(input);
  input.focus();
  input.select();

  const salvar = async () => {
    const novoTexto = input.value.trim() || textoAtual;

    const novoSpan = document.createElement('span');
    novoSpan.id = 'link6-section-title';
    novoSpan.textContent = novoTexto;
    novoSpan.setAttribute('ondblclick', 'editarNomeSecaoLink6()');

    input.replaceWith(novoSpan);

    try {
      const { error } = await supabase
        .from('links_rastreados')
        .update({ nome: novoTexto, updated_at: new Date() })
        .eq('id', 'link6')
        .eq('client_id', CLIENT_ID);

      if (error) throw error;

      const linkIndex = linksRastreados.findIndex(l => l.id === 'link6');
      if (linkIndex !== -1) {
        linksRastreados[linkIndex].nome = novoTexto;
      }

      atualizarNomeFiltro('link6', novoTexto);
      localStorage.setItem('link6_section_title', novoTexto);

      mostrarAlerta('✅ Nome atualizado com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao salvar nome:', e);
      mostrarAlerta('❌ Erro ao salvar nome', 'error');
    }
  };

  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      salvar();
    } else if (e.key === 'Escape') {
      input.value = textoAtual;
      salvar();
    }
  });
}

function carregarNomePersonalizadoLink6() {
  try {
    const nomePersonalizado = localStorage.getItem('link6_section_title');
    if (nomePersonalizado) {
      const titleElement = document.getElementById('link6-section-title');
      if (titleElement) {
        titleElement.textContent = nomePersonalizado;
      }
    }
    atualizarNomeFiltro('link6', nomePersonalizado || 'Link 6');
  } catch (e) {
    console.warn('Erro ao carregar nome personalizado link6:', e);
  }
}

function atualizarLinksLink6() {
  const link6Url = document.getElementById('link6-url').value.trim();
  const btnGerarCodigo = document.getElementById('btn-gerar-codigo-link6');

  const codigosPlataforma = {
    'instagram': 'ti',
    'tiktok': 'tt',
    'youtube': 'ty',
    'linkedin': 'tl',
    'whatsapp': 'tw',
    'trafego-pago': 'tp',
    'twitter': 'tx',
    'threads': 'th',
    'gmb': 'gmb'
  };

  if (!link6Url) {
    Object.keys(codigosPlataforma).forEach(plataforma => {
      document.getElementById(`link-link6-${plataforma}`).textContent = 'Digite sua URL acima';
    });
    if (btnGerarCodigo) btnGerarCodigo.style.display = 'none';
    return;
  }

  if (btnGerarCodigo) btnGerarCodigo.style.display = 'block';

  const separador = link6Url.includes('?') ? '&' : '?';

  Object.entries(codigosPlataforma).forEach(([plataforma, codigo]) => {
    const linkCompleto = `${link6Url}${separador}origem=${codigo}&link_id=link6`;
    document.getElementById(`link-link6-${plataforma}`).textContent = linkCompleto;
  });
}

function copiarLinkLink6(plataforma) {
  const linkElement = document.getElementById(`link-link6-${plataforma}`);
  const link = linkElement.textContent;

  if (!link || link === 'Digite sua URL acima') {
    mostrarAlerta('⚠️ Por favor, insira a URL primeiro!', 'error');

    const link6Content = document.getElementById('link6-content');
    const link6Btn = document.getElementById('link6-toggle-btn');
    if (link6Content.classList.contains('collapsed')) {
      link6Content.classList.remove('collapsed');
      link6Btn.classList.remove('collapsed');
      link6Btn.textContent = '▼';
    }

    document.getElementById('link6-url').focus();
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    mostrarAlerta(`✅ Link 6 do ${capitalize(plataforma)} copiado!`, 'success');
  }).catch(() => {
    mostrarAlerta('❌ Erro ao copiar. Tente selecionar manualmente.', 'error');
  });
}

// A inicialização agora é feita pela função inicializarDashboard() após o login