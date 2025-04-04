const SERVER_KEY = 'server4_ads';
const IMP = 1.12;
const endpoint = 'https://script.google.com/macros/s/AKfycbzKwlkbBjaXyeSoVhJWs7hsjAiBIEQIIzpa8p_Y95ZgtMj7O0hfay-u83i9O9NKTK4_TA/exec?action=getAvailableAds';

let adsList = [];

function openModal() {
  document.getElementById("adsModal").style.display = "flex";
  fetch(endpoint)
    .then(res => res.json())
    .then(data => {
      adsList = data;
      renderAdsTable();
    });
}

function closeModal() {
  document.getElementById("adsModal").style.display = "none";
}

function renderAdsTable() {
  const tbody = document.querySelector("#adsTable tbody");
  tbody.innerHTML = "";
  const yaActivos = loadAds().map(ad => ad.id); // IDs activos

  adsList
    .filter(ad => !yaActivos.includes(ad.id)) // excluir los ya activos
    .forEach((ad, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${ad.id}</td>
        <td>${ad.anuncio}</td>
        <td>${ad.campaña}</td>
        <td>${ad.cuenta}</td>
        <td>$${ad.cpc.toFixed(2)}</td>
        <td><button class="btn" onclick="addAd(${i})">Agregar</button></td>
      `;
      tbody.appendChild(row);
    });
}

function addAd(index) {
  const ad = adsList[index];
  const newAd = {
    ...ad,
    presupuesto: 0,
    api: '',
    estado: 'ACTIVA',
    leads: 0,
    cargas: 0,
    gasto: 0
  };
  const ads = loadAds();
  ads.push(newAd);
  saveAds(ads);
  renderServer4();
  renderDashboardResumen();
  closeModal();
}

function renderServer4() {
  const tbody = document.querySelector("#server4Table tbody");
  tbody.innerHTML = "";
  loadAds().forEach((ad, i) => {
    const gastoImp = ad.gasto * IMP;
    const conv = ad.leads > 0 ? (ad.cargas / ad.leads * 100) : 0;
    const precioLead = ad.leads > 0 ? (ad.gasto / ad.leads) : 0;
    const precioCarga = ad.cargas > 0 ? (ad.gasto / ad.cargas) : 0;
    const precioCargaImp = precioCarga * IMP;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${ad.id}</td>
      <td>${ad.anuncio}</td>
      <td>${ad.campaña}</td>
      <td>${ad.cuenta}</td>
      <td><input type="number" value="${ad.presupuesto}" onchange="updateAd(${i}, 'presupuesto', this.value)" /></td>
      <td><input type="text" value="${ad.api}" onchange="updateAd(${i}, 'api', this.value)" /></td>
      <td>${ad.estado}</td>
      <td><input type="number" value="${ad.leads}" onchange="updateAd(${i}, 'leads', this.value)" /></td>
      <td><input type="number" value="${ad.cargas}" onchange="updateAd(${i}, 'cargas', this.value)" /></td>
      <td><input type="number" value="${ad.gasto}" onchange="updateAd(${i}, 'gasto', this.value)" /></td>
      <td>$${gastoImp.toFixed(2)}</td>
      <td>${conv.toFixed(2)}%</td>
      <td>$${precioLead.toFixed(2)}</td>
      <td>$${precioCarga.toFixed(2)}</td>
      <td>$${precioCargaImp.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateAd(index, field, value) {
  const ads = loadAds();
  ads[index][field] = field === 'api' ? value : parseFloat(value);
  saveAds(ads);
  renderServer4();
  renderDashboardResumen();
}

function loadAds() {
  const raw = localStorage.getItem(SERVER_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAds(ads) {
  localStorage.setItem(SERVER_KEY, JSON.stringify(ads));
}

// Reset cada 24 hs
(function resetIfExpired() {
  const last = localStorage.getItem('server4_last_reset');
  const now = Date.now();
  if (!last || now - parseInt(last) > 24 * 60 * 60 * 1000) {
    localStorage.setItem(SERVER_KEY, '[]');
    localStorage.setItem('server4_last_reset', now.toString());
  }
})();

function renderDashboardResumen() {
  const ads = loadAds();
  let totalLeads = 0, totalCargas = 0, totalGasto = 0;

  ads.forEach(ad => {
    totalLeads += ad.leads;
    totalCargas += ad.cargas;
    totalGasto += ad.gasto;
  });

  const gastoImp = totalGasto * IMP;
  const conversion = totalLeads > 0 ? (totalCargas / totalLeads * 100) : 0;
  const precioCargaImp = totalCargas > 0 ? (gastoImp / totalCargas) : 0;

  document.getElementById("resumen-server4").innerHTML = `
    Leads: <b>${totalLeads}</b> |
    Cargas: <b>${totalCargas}</b> |
    Gasto+Imp: <b>$${gastoImp.toFixed(2)}</b> |
    Conversión: <b>${conversion.toFixed(2)}%</b> |
    $Carga+Imp: <b>$${precioCargaImp.toFixed(2)}</b>
  `;
}

renderServer4();
renderDashboardResumen();
