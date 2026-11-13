let grafico = null;
let localAtual = null;
let requisicaoAtual = 0;

const $ = (id) => document.getElementById(id);
function status(mensagem) { $('status').textContent = mensagem; }
function numero(valor, casas = 0) { return Number.isFinite(valor) ? valor.toLocaleString('pt-BR', {maximumFractionDigits:casas,minimumFractionDigits:casas}) : '—'; }
function horaLocal(iso) { return typeof iso === 'string' ? iso.slice(11, 16) : '—'; }
function diaFormatado(iso) { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {weekday:'short',day:'2-digit',month:'2-digit'}); }
function descricaoTempo(codigo) {
  if (codigo === 0) return ['Céu limpo', '☀️'];
  if ([1,2].includes(codigo)) return ['Parcialmente nublado', '🌤️'];
  if (codigo === 3) return ['Nublado', '☁️'];
  if ([45,48].includes(codigo)) return ['Neblina', '🌫️'];
  if ([51,53,55,56,57].includes(codigo)) return ['Garoa', '🌦️'];
  if ([61,63,65,66,67,80,81,82].includes(codigo)) return ['Chuva', '🌧️'];
  if ([71,73,75,77,85,86].includes(codigo)) return ['Neve', '❄️'];
  if ([95,96,99].includes(codigo)) return ['Trovoadas', '⛈️'];
  return ['Condição não informada', '🌡️'];
}
async function obterJSON(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) throw new Error(`Falha na consulta ao servidor (HTTP ${resposta.status}).`);
  const dados = await resposta.json();
  if (dados.error) throw new Error(dados.reason || 'A API retornou um erro.');
  return dados;
}
async function pesquisarLocal(termo) {
  const params = new URLSearchParams({format:'json',q:termo.trim(),addressdetails:'1',limit:'1',countrycodes:'br', 'accept-language':'pt-BR'});
  // O navegador não pode definir manualmente o cabeçalho User-Agent.
  const dados = await obterJSON(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!dados.length) throw new Error('Local não encontrado. Informe bairro/rua, cidade e estado.');
  const item = dados[0], endereco = item.address || {};
  const bairro = endereco.suburb || endereco.neighbourhood || endereco.city_district || endereco.residential || endereco.road;
  const cidade = endereco.city || endereco.town || endereco.municipality || endereco.village || endereco.county;
  const estado = endereco.state;
  const partes = [bairro, cidade, estado].filter(Boolean);
  return {nomeFormatado: partes.length ? [...new Set(partes)].join(', ') : item.display_name,lat:Number(item.lat),lon:Number(item.lon)};
}
function avisar(texto, nivel = 'atencao') {
  const artigo = document.createElement('article');
  artigo.className = `aviso ${nivel}`;
  const p = document.createElement('p'); p.textContent = texto; artigo.appendChild(p);
  $('avisos').appendChild(artigo);
}
function criarAvisos(dados) {
  $('avisos').replaceChildren();
  const d = dados.daily;
  // Critérios didáticos para avisos indicativos, não limiares oficiais do INMET.
  const chance = d.precipitation_probability_max?.[0];
  const chuva = d.precipitation_sum?.[0];
  const rajadas = d.wind_gusts_10m_max?.[0];
  const uv = d.uv_index_max?.[0];
  const max = d.temperature_2m_max?.[0];
  const cod = d.weather_code?.[0];
  if ([95,96,99].includes(cod)) avisar('Previsão de trovoadas para hoje. Evite áreas abertas durante tempestades.', 'elevado');
  if (Number.isFinite(chuva) && chuva >= 30) avisar(`Precipitação acumulada prevista para hoje: ${numero(chuva,1)} mm. Atenção a locais sujeitos a alagamentos.`, 'elevado');
  else if (Number.isFinite(chance) && chance >= 70) avisar(`Probabilidade máxima diária de precipitação: ${numero(chance)}%. Considere levar guarda-chuva.`);
  if (Number.isFinite(rajadas) && rajadas >= 60) avisar(`Rajadas máximas previstas de ${numero(rajadas)} km/h. Cuidado com objetos soltos e árvores.`, 'elevado');
  else if (Number.isFinite(rajadas) && rajadas >= 40) avisar(`Rajadas previstas de até ${numero(rajadas)} km/h.`, 'atencao');
  if (Number.isFinite(uv) && uv >= 8) avisar(`Índice UV máximo previsto de ${numero(uv,1)}. Use proteção solar e evite exposição prolongada.`, 'atencao');
  if (Number.isFinite(max) && max >= 35) avisar(`Máxima prevista de ${numero(max,1)}°C. Redobre os cuidados com hidratação e calor.`, 'atencao');
  if (!$('avisos').children.length) avisar('Nenhum aviso automático foi acionado pelos critérios deste painel para hoje.', 'normal');
}
function mostrarCards(dados, local) {
  const c = dados.current, d = dados.daily;
  $('nome-local').textContent = local.nomeFormatado;
  $('data-atualizacao').textContent = `Condições de referência: ${horaLocal(c.time)} (horário local da previsão)`;
  const [condicao, icone] = descricaoTempo(c.weather_code);
  $('condicao-atual').textContent = `${icone} ${condicao}`;
  $('temperatura').textContent = `${numero(c.temperature_2m,1)} °C`;
  $('sensacao').textContent = `Sensação térmica: ${numero(c.apparent_temperature,1)} °C`;
  $('umidade').textContent = `${numero(c.relative_humidity_2m)}%`;
  $('vento').textContent = `${numero(c.wind_speed_10m,1)} km/h`;
  $('rajadas').textContent = `Rajadas atuais: ${numero(c.wind_gusts_10m,1)} km/h`;
  $('chance-chuva').textContent = `${numero(d.precipitation_probability_max[0])}%`;
  $('chuva-acumulada').textContent = `Acumulado previsto hoje: ${numero(d.precipitation_sum[0],1)} mm`;
  const uv = d.uv_index_max[0];
  $('uv').textContent = numero(uv,1);
  $('uv-classificacao').textContent = uv < 3 ? 'Baixo' : uv < 6 ? 'Moderado' : uv < 8 ? 'Alto' : uv < 11 ? 'Muito alto' : 'Extremo';
  $('nascer-sol').textContent = horaLocal(d.sunrise[0]);
  $('por-sol').textContent = `Pôr do sol: ${horaLocal(d.sunset[0])}`;
}
function mostrarDias(dados) {
  const destino = $('previsao-dias'); destino.replaceChildren();
  const d = dados.daily;
  d.time.forEach((data, i) => {
    const [condicao, icone] = descricaoTempo(d.weather_code[i]);
    const card = document.createElement('article'); card.className = 'dia';
    const titulo = document.createElement('h3'); titulo.textContent = diaFormatado(data);
    const simbolo = document.createElement('div'); simbolo.className = 'icone'; simbolo.textContent = icone;
    const temp = document.createElement('p'); temp.className = 'temp'; temp.textContent = `${numero(d.temperature_2m_max[i])}° / ${numero(d.temperature_2m_min[i])}°`;
    const descricao = document.createElement('p'); descricao.textContent = condicao;
    const chuva = document.createElement('p'); chuva.textContent = `🌧️ ${numero(d.precipitation_probability_max[i])}% · ${numero(d.precipitation_sum[i],1)} mm`;
    card.append(titulo,simbolo,temp,descricao,chuva); destino.appendChild(card);
  });
}
function mostrarGrafico(dados) {
  if (typeof Chart === 'undefined') throw new Error('A biblioteca Chart.js não foi carregada. Verifique a conexão.');
  const h = dados.hourly;
  const inicio = h.time.findIndex(t => t >= dados.current.time.slice(0,13) + ':00');
  const pos = Math.max(0, inicio);
  const limite = pos + 24;
  const rotulos = h.time.slice(pos,limite).map(horaLocal);
  if (grafico) grafico.destroy();
  grafico = new Chart($('grafico-temperatura'), {
    type:'line',
    data:{labels:rotulos,datasets:[
      {label:'Temperatura (°C)',data:h.temperature_2m.slice(pos,limite),borderColor:'#6ab7ff',backgroundColor:'rgba(106,183,255,.13)',fill:true,tension:.3,yAxisID:'temperatura',pointRadius:2},
      {label:'Chance de chuva (%)',data:h.precipitation_probability.slice(pos,limite),borderColor:'#64e4b3',borderDash:[6,4],tension:.3,yAxisID:'probabilidade',pointRadius:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#eaf2ff'}}},scales:{x:{ticks:{color:'#b2c2d6',maxTicksLimit:12},grid:{color:'#293c54'}},temperatura:{position:'left',title:{display:true,text:'°C',color:'#b2c2d6'},ticks:{color:'#b2c2d6'},grid:{color:'#293c54'}},probabilidade:{position:'right',min:0,max:100,title:{display:true,text:'%',color:'#b2c2d6'},ticks:{color:'#b2c2d6'},grid:{drawOnChartArea:false}}}}
  });
}
async function carregarClima(local) {
  const token = ++requisicaoAtual;
  $('atualizar').disabled = true;
  status(`Carregando previsão para ${local.nomeFormatado}...`);
  try {
    const params = new URLSearchParams({latitude:String(local.lat),longitude:String(local.lon),current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m',hourly:'temperature_2m,precipitation_probability',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,uv_index_max,sunrise,sunset',forecast_days:'7',timezone:'auto'});
    const dados = await obterJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (token !== requisicaoAtual) return;
    mostrarCards(dados,local);
    criarAvisos(dados);
    mostrarDias(dados);
    $('painel').hidden = false;
    mostrarGrafico(dados);
    status(`Previsão atualizada para ${local.nomeFormatado}.`);
  } catch (erro) {
    if (token === requisicaoAtual) status(`Erro: ${erro.message}`);
  } finally {
    if (token === requisicaoAtual) $('atualizar').disabled = !localAtual;
  }
}
$('form-busca').addEventListener('submit', async evento => {
  evento.preventDefault();
  $('buscar').disabled = true; $('atualizar').disabled = true;
  localAtual = null; ++requisicaoAtual;
  $('painel').hidden = true;
  try {
    status('Buscando localização...');
    const local = await pesquisarLocal($('cidade').value);
    localAtual = local;
    await carregarClima(local);
  } catch (erro) {status(`Erro: ${erro.message}`);}
  finally {$('buscar').disabled = false;}
});
$('atualizar').addEventListener('click', () => {if(localAtual) carregarClima(localAtual);});


const LOCAL_PADRAO = {
    nomeFormatado: "Toledo, Paraná",
    lat: -24.7246,
    lon: -53.7412
};

// Identifica a localização aproximada pelo IP público
async function detectarLocalizacaoIP() {
    try {
        status("Identificando localização pela rede...");

        const resposta = await fetch("https://ipwho.is/");
        if (!resposta.ok) {
            throw new Error("Serviço de localização indisponível");
        }

        const dados = await resposta.json();

        if (
            dados.success === false ||
            !Number.isFinite(Number(dados.latitude)) ||
            !Number.isFinite(Number(dados.longitude)) ||
            dados.country_code !== "BR"
        ) {
            throw new Error("Localização não identificada no Brasil");
        }

        return {
            nomeFormatado: `${dados.city || "Região"}, ${dados.region || "Brasil"}`,
            lat: Number(dados.latitude),
            lon: Number(dados.longitude)
        };

    } catch (erro) {
        console.warn("Localização por IP:", erro.message);
        return { ...LOCAL_PADRAO };
    }
}

// Executa automaticamente ao abrir a página
document.addEventListener("DOMContentLoaded", async () => {
    localAtual = await detectarLocalizacaoIP();

    const campoCidade = document.getElementById("cidade");

    if (campoCidade) {
        campoCidade.value = localAtual.nomeFormatado;
    }

    await carregarClima(localAtual);
});