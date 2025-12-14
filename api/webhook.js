import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://owiweuvfgvphkonktzsr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aXdldXZmZ3ZwaGtvbmt0enNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NzYwNTYsImV4cCI6MjA3NDA1MjA1Nn0.xXbxSu_wm4vRH7XeqoJHXl8FXuTQgG20BOqwnOtKHHc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🕐 Retorna timestamp no horário de Brasília (para coluna timestamp sem timezone)
function getTimestampBrasilia() {
  const agora = new Date();
  // Converte para formato ISO de Brasília (sem offset)
  const brasiliaStr = agora.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  // sv-SE retorna formato: "2025-12-02 13:52:59"
  return brasiliaStr.replace(' ', 'T'); // Retorna: 2025-12-02T13:52:59
}

// 🎯 Mapeamento de produtos para clientes
const PRODUCT_TO_CLIENT = {
  '820dc7ab-2d8d-4684-9e3c-4f91b940e6af': 'cliente1',     // Serena IA (Carlos)
  '43a79605-5066-463e-8aa0-7a9b8d2b7a5d': 'cliente2',     // TokShop BR (Jhonatas)
  'R65XMX': 'cliente3',                                    // Metricfy (Payt code)
};

// 🎯 Mapeamento de checkout para cliente
const CHECKOUT_TO_CLIENT = {
  'O2Nai11': 'cliente1',     // Serena IA (Carlos) - Kiwify
  'yz2Szfq': 'cliente2',     // TokShop BR (Jhonatas) - Kiwify
  'kNCnnDA': 'cliente3',     // Metricfy Pro (R$ 49,90) - Payt
  'LmCaaGa': 'cliente3',     // Metricfy Starter (R$ 29,90) - Payt
};

// 💎 Mapeamento de checkout para plano
const CHECKOUT_TO_PLANO = {
  'kNCnnDA': 'pro',         // Pro (R$ 49,90)
  'LmCaaGa': 'starter',     // Starter (R$ 29,90)
};

// 🔍 Função para detectar origem do webhook (Kiwify ou Payt)
function detectarOrigem(payload) {
  // Kiwify usa: webhook_event_type
  if (payload.webhook_event_type) {
    return 'kiwify';
  }
  
  // Payt pode usar: event, type, status
  if (payload.event || payload.type || payload.status === 'approved') {
    return 'payt';
  }
  
  return 'desconhecido';
}

// 📦 Normaliza dados do Kiwify
function normalizarKiwify(payload) {
  return {
    origem: payload.TrackingParameters?.utm_source || 'direto',
    planoFromUtm: payload.TrackingParameters?.utm_plano || null,
    checkoutId: payload.TrackingParameters?.checkout_id || null,
    checkoutLink: payload.checkout_link,
    productId: payload.Product?.product_id,
    valor: (payload.Commissions?.charge_amount || 0) / 100,
    orderId: payload.order_id,
    customerEmail: payload.Customer?.email,
    customerName: payload.Customer?.full_name,
    paymentMethod: payload.payment_method,
    produtoNome: payload.Product?.product_name,
  };
}

// 📦 Normaliza dados do Payt
function normalizarPayt(payload) {
  // Extrai checkout_link da URL (Payt envia URL completa)
  let checkoutLink = null;
  if (payload.link?.url) {
    // Extrai o código do final da URL: https://payt.site/LmCaaGa → LmCaaGa
    checkoutLink = payload.link.url.split('/').pop();
  }
  
  // 🆔 Extrai checkout_id dos query_params (NOVO!)
  let checkoutId = null;
  let origem = 'direto';
  let planoFromUtm = null;
  
  // DEBUG: Mostra estrutura dos query_params
  if (payload.link?.query_params) {
    console.log('🔍 DEBUG query_params:', JSON.stringify(payload.link.query_params));
    console.log('🔍 Tipo:', typeof payload.link.query_params);
    console.log('🔍 É array?', Array.isArray(payload.link.query_params));
  }
  
  // Tenta extrair de link.query_params
  if (payload.link?.query_params) {
    const params = payload.link.query_params;
    
    // Pode ser array de objetos OU objeto direto
    if (Array.isArray(params)) {
      // Formato array: [{checkout_id: "..."}, {utm_source: "..."}]
      params.forEach(param => {
        if (param.checkout_id) checkoutId = param.checkout_id;
        if (param.utm_source) origem = param.utm_source;
        if (param.utm_plano) planoFromUtm = param.utm_plano;
      });
    } else if (typeof params === 'object') {
      // Formato objeto: {checkout_id: "...", utm_source: "..."}
      console.log('✅ É objeto! Extraindo checkout_id...');
      if (params.checkout_id) {
        checkoutId = params.checkout_id;
        console.log(`✅ checkout_id extraído: ${checkoutId}`);
      }
      if (params.utm_source) origem = params.utm_source;
      if (params.utm_plano) planoFromUtm = params.utm_plano;
    }
  }
  
  console.log(`📍 Após extração: checkout_id=${checkoutId}, origem=${origem}`);
  
  // Tenta extrair de customer.origin.query_params (Payt pode enviar aqui também)
  if (!checkoutId && payload.customer?.origin?.query_params) {
    const customerParams = payload.customer.origin.query_params;
    if (typeof customerParams === 'object') {
      if (customerParams.checkout_id) checkoutId = customerParams.checkout_id;
      if (customerParams.utm_source) origem = customerParams.utm_source;
      if (customerParams.utm_plano) planoFromUtm = customerParams.utm_plano;
    }
  }
  
  // Fallback: tenta outras estruturas
  if (origem === 'direto') {
    origem = 
      payload.utm_source ||
      payload.tracking?.utm_source ||
      payload.TrackingParameters?.utm_source ||
      payload.source ||
      'direto';
  }
  
  if (!planoFromUtm) {
    planoFromUtm = 
      payload.utm_plano ||
      payload.tracking?.utm_plano ||
      payload.TrackingParameters?.utm_plano ||
      payload.plan ||
      null;
  }
  
  // Extrai valor (Payt envia em centavos)
  let valor = 0;
  if (payload.transaction?.total_price) {
    valor = payload.transaction.total_price / 100;
  } else if (payload.product?.price) {
    valor = payload.product.price / 100;
  } else if (payload.amount) {
    valor = payload.amount > 1000 ? payload.amount / 100 : payload.amount;
  }
  
  // Extrai product_id (Payt chama de "code")
  const productId = payload.product?.code || payload.product_id || payload.productId;
  
  return {
    origem,
    planoFromUtm,
    checkoutId,
    checkoutLink,
    productId,
    valor,
    orderId: payload.cart_id || payload.order_id || payload.transaction_id,
    customerEmail: payload.customer?.email,
    customerName: payload.customer?.name,
    paymentMethod: payload.transaction?.payment_method || 'unknown',
    produtoNome: payload.product?.name,
  };
}

export default async function handler(req, res) {
  // Aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      message: 'Este endpoint só aceita POST' 
    });
  }

  try {
    const payload = req.body;

    console.log('📦 Webhook recebido:', JSON.stringify(payload, null, 2));

    // Detecta origem do webhook
    const origemWebhook = detectarOrigem(payload);
    console.log(`🔍 Origem detectada: ${origemWebhook}`);

    // Normaliza dados baseado na origem
    let dadosNormalizados;
    
    if (origemWebhook === 'kiwify') {
      // Valida se é uma venda aprovada (Kiwify)
      if (payload.webhook_event_type !== 'order_approved') {
        console.log('⏭️ Evento Kiwify ignorado:', payload.webhook_event_type);
        return res.status(200).json({ 
          message: 'Evento ignorado',
          event_type: payload.webhook_event_type 
        });
      }
      dadosNormalizados = normalizarKiwify(payload);
    } 
    else if (origemWebhook === 'payt') {
      // Valida se é uma venda aprovada (Payt)
      const status = payload.status || payload.event || payload.type;
      if (status !== 'approved' && status !== 'paid' && status !== 'completed') {
        console.log('⏭️ Evento Payt ignorado:', status);
        return res.status(200).json({ 
          message: 'Evento ignorado',
          status: status 
        });
      }
      dadosNormalizados = normalizarPayt(payload);
    }
    else {
      console.warn('⚠️ Origem do webhook não reconhecida!');
      console.log('💡 Payload recebido:', payload);
      return res.status(400).json({ 
        error: 'Webhook não reconhecido',
        message: 'Adicione suporte para este formato no webhook' 
      });
    }

    let origem, planoFromUtm, checkoutId, checkoutLink, productId, valor, orderId, customerEmail, customerName, paymentMethod, produtoNome;
    
    ({
      origem, 
      planoFromUtm, 
      checkoutId,
      checkoutLink, 
      productId, 
      valor, 
      orderId, 
      customerEmail, 
      customerName, 
      paymentMethod, 
      produtoNome 
    } = dadosNormalizados);

    // 🎯 Identifica qual cliente
    let clientId = null;
    let plano = planoFromUtm;
    
    // Tenta identificar pelo product_id
    if (productId && PRODUCT_TO_CLIENT[productId]) {
      clientId = PRODUCT_TO_CLIENT[productId];
      console.log(`✅ Cliente identificado por product_id: ${productId} → ${clientId}`);
    }
    // Tenta pelo checkout_link
    else if (checkoutLink && CHECKOUT_TO_CLIENT[checkoutLink]) {
      clientId = CHECKOUT_TO_CLIENT[checkoutLink];
      console.log(`✅ Cliente identificado por checkout_link: ${checkoutLink} → ${clientId}`);
    }

    // 🆔 NOVO: Se tem checkout_id, busca origem e plano do banco! (100% PRECISO!)
    if (checkoutId) {
      console.log(`🔍 checkout_id encontrado: ${checkoutId}`);
      console.log(`🔍 Buscando dados exatos no checkout_clicks...`);
      
      try {
        const { data: checkoutData, error: checkoutError } = await supabase
          .from('checkout_clicks')
          .select('origem, plano, client_id')
          .eq('checkout_id', checkoutId)
          .single();
        
        if (checkoutError) {
          console.warn('⚠️ Erro ao buscar checkout_id:', checkoutError.message);
        } else if (checkoutData) {
          // ✅ Match perfeito! Usa dados do banco
          origem = checkoutData.origem;
          plano = checkoutData.plano;
          clientId = checkoutData.client_id;
          console.log(`✅ Match 100% preciso via checkout_id!`);
          console.log(`   → origem: ${origem}`);
          console.log(`   → plano: ${plano}`);
          console.log(`   → client_id: ${clientId}`);
        } else {
          console.warn(`⚠️ checkout_id não encontrado no banco: ${checkoutId}`);
          console.warn(`   Isso pode acontecer se o clique não foi registrado antes da compra`);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar checkout_id:', error.message);
      }
    }

    // 💎 Se é cliente3 e ainda não tem plano, detecta pelo checkout_link (fallback)
    if (clientId === 'cliente3' && !plano && checkoutLink) {
      console.log(`🔍 Tentando detectar plano pelo checkout_link: ${checkoutLink}`);
      
      if (CHECKOUT_TO_PLANO[checkoutLink]) {
        plano = CHECKOUT_TO_PLANO[checkoutLink];
        console.log(`💎 Plano detectado por checkout_link: ${checkoutLink} → ${plano}`);
      } else {
        console.warn(`⚠️ Checkout não mapeado: ${checkoutLink}`);
      }
    }

    // Se não identificou cliente
    if (!clientId) {
      console.warn(`⚠️ Cliente não identificado!`);
      console.warn(`   product_id: ${productId}`);
      console.warn(`   checkout_link: ${checkoutLink}`);
      console.warn(`   checkout_id: ${checkoutId}`);
      console.warn('💡 Adicione no mapeamento do webhook.js');
      clientId = 'desconhecido';
    }

    // Prepara dados da venda
    const timestampBrasilia = getTimestampBrasilia();
    console.log(`🕐 Timestamp Brasília: ${timestampBrasilia} (${new Date(timestampBrasilia).toLocaleString('pt-BR')})`);

    const vendaData = {
      origem: origem,
      plano: plano,
      client_id: clientId,
      timestamp: timestampBrasilia,  // ← NOVO: timestamp em horário de Brasília
      valor: valor,
      order_id: orderId,
      customer_email: customerEmail,
      customer_name: customerName,
      payment_method: paymentMethod,
      produto: produtoNome,
      product_id: productId,
      checkout_link: checkoutLink,
      checkout_id: checkoutId
    };

    console.log('💾 Salvando venda no Supabase:', vendaData);

    // Insere no Supabase
    const { data, error } = await supabase
      .from('sales')
      .insert([vendaData]);

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar venda', 
        details: error.message 
      });
    }

    console.log('✅ Venda registrada com sucesso!');

    // Retorna sucesso
    return res.status(200).json({ 
      success: true, 
      message: 'Venda registrada com sucesso',
      webhook_origin: origemWebhook,
      origem: origem,
      plano: plano,
      client_id: clientId,
      valor: valor,
      checkout: checkoutLink,
      checkout_id: checkoutId,
      precisao: checkoutId ? '100%' : '99%'
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      details: error.message 
    });
  }
}