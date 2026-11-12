// Dashboard meteorológico: Geocoding + Forecast da Open-Meteo.
const $ = (id) => document.getElementById(id);
let grafico = null;
let localAtual = { nome: 'Toledo', latitude: -24.72, longitude: -53.74, admin1: 'Paraná', country: 'Brasil' };
const codigos = {
  0: ['Céu limpo','☀️'], 1: ['Predominantemente limpo','🌤️'], 2: ['Parcialmente nublado','⛅'], 3: ['Nublado','☁️'],
  45: ['Nevoeiro','🌫️'], 48: ['Nevoeiro com geada','🌫️'], 51: ['Garoa leve','🌦️'], 53: ['Garoa','🌦️'], 55: ['Garoa intensa','🌧️'],
  56: ['Garoa congelante','🌧️'], 57: ['Garoa congelante intensa','🌧️'], 61: ['Chuva leve','🌦️'], 63: ['Chuva','🌧️'], 65: ['Chuva forte','🌧️'],
  66: ['Chuva congelante','🌧️'], 67: ['Chuva congelante forte','🌧️'], 71: ['Neve leve','🌨️'], 73: ['Neve','🌨️'], 75: ['Neve intensa','❄️'],
  77: ['Grãos de neve','🌨️'], 80: ['Pancadas leves','🌦️'], 81: ['Pancadas de chuva','🌧️'], 82: ['Pancadas fortes','⛈️'],
  85: ['Pancadas de neve','🌨️'], 86: ['Pancadas fortes de neve','❄️'], 95: ['Trovoada','⛈️'], 96: ['Trovoada com granizo','⛈️'], 99: ['Trovoada com granizo forte','⛈️']
};
const tempo = (codigo) => codigos[codigo] ?? ['Condição não identificada','🌡️'];
const arred = (valor) => `${Math.round(valor)}°`;
function status(mensagem, erro=false) { $('status').textContent = mensagem; $('status').classList.toggle('erro', erro); }
function formatarDia(iso) { return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`)); }
function rotuloHora(iso) { return iso.slice(11,16); }
async function obterJSON(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
  return resposta.json();
}
async function pesquisarCidade(nome) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=10&language=pt&format=json`;
  const dados = await obterJSON(url);
  if (!dados.results?.length) throw new Error('Cidade não encontrada. Verifique o nome e tente novamente.');
  // Preferência para cidades brasileiras quando há nomes repetidos.
  return dados.results.find(item => item.country_code === 'BR') ?? dados.results[0];
}
async function carregarClima(local) {
  status('Consultando dados meteorológicos...');
  $('atualizar').disabled = true;
  const params = new URLSearchParams({
    latitude: local.latitude, longitude: local.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '7', forecast_hours: '24', timezone: 'auto'
  });
  try {
    const dados = await obterJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!dados.current || !dados.daily || !dados.hourly) throw new Error('Resposta incompleta da API.');
    localAtual = local;
    const atual = dados.current;
    $('titulo-atual').textContent = [local.name ?? local.nome, local.admin1, local.country].filter(Boolean).join(', ');
    $('data-atual').textContent = `Atualizado: ${atual.time.replace('T',' ')} (horário local)`;
    $('temperatura').textContent = Math.round(atual.temperature_2m);
    $('icone-atual').textContent = tempo(atual.weather_code)[1];
    $('descricao').textContent = tempo(atual.weather_code)[0];
    $('sensacao').textContent = `${arred(atual.apparent_temperature)}C`;
    $('umidade').textContent = `${atual.relative_humidity_2m}%`;
    $('vento').textContent = `${Math.round(atual.wind_speed_10m)} km/h`;
    $('precipitacao').textContent = `${atual.precipitation} mm`;
    const diario = dados.daily;
    $('previsao').replaceChildren();
    diario.time.forEach((dia, i) => {
      const item = document.createElement('article');
      item.className = 'dia';
      const titulo = document.createElement('strong'); titulo.textContent = formatarDia(dia);
      const icone = document.createElement('div'); icone.className = 'emoji'; icone.textContent = tempo(diario.weather_code[i])[1];
      const maxima = document.createElement('div'); maxima.className = 'max'; maxima.textContent = `Máx ${arred(diario.temperature_2m_max[i])}C`;
      const minima = document.createElement('div'); minima.className = 'min'; minima.textContent = `Mín ${arred(diario.temperature_2m_min[i])}C`;
      const chuva = document.createElement('div'); chuva.className = 'chuva'; chuva.textContent = `☔ ${diario.precipitation_probability_max[i] ?? '—'}%`;
      item.append(titulo,icone,maxima,minima,chuva); $('previsao').append(item);
    });
    if (typeof Chart !== 'undefined') {
      if (grafico) grafico.destroy();
      grafico = new Chart($('grafico-temperatura'), {
        type: 'line',
        data: { labels: dados.hourly.time.map(rotuloHora), datasets: [{ label:'Temperatura (°C)',data:dados.hourly.temperature_2m,borderColor:'#5fc4ff',backgroundColor:'rgba(95,196,255,.12)',fill:true,tension:.35,pointRadius:2 }] },
        options: { responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#eaf2ff'}}},scales:{x:{ticks:{color:'#b3c7dd',maxTicksLimit:12},grid:{color:'#ffffff14'}},y:{ticks:{color:'#b3c7dd'},grid:{color:'#ffffff14'}}} }
      });
    } else { status('Dados carregados. O gráfico requer conexão à biblioteca Chart.js.'); return; }
    status('Dados atualizados com sucesso.');
  } catch (erro) { status(`Não foi possível carregar os dados: ${erro.message}`,true); }
  finally { $('atualizar').disabled = false; }
}
$('form-busca').addEventListener('submit',async (evento) => {
  evento.preventDefault();
  const botao = $('form-busca').querySelector('button'); botao.disabled = true;
  try { status('Procurando cidade...'); const local = await pesquisarCidade($('cidade').value.trim()); await carregarClima(local); }
  catch (erro) { status(erro.message,true); }
  finally { botao.disabled = false; }
});
$('atualizar').addEventListener('click',() => carregarClima(localAtual));
carregarClima(localAtual);
