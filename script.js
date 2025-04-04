const SERVER_KEY = 'server4_ads';
const IMP = 1.12;
const endpoint = 'https://script.google.com/macros/s/AKfycbzKwlkbBjaXyeSoVhJWs7hsjAiBIEQIIzpa8p_Y95ZgtMj7O0hfay-u83i9O9NKTK4_TA/exec?action=getAvailableAds';

let adsList = [];
let selectedAd = null;

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

function openConfigModal(ad) {
  selectedAd = ad;
  document.getElementById("inputPresupuesto").value = '';
  document.getElementById("inputAPI").value = '';
  document.getElementById("configModal").style.display = "flex";
}

function closeConfigModal() {
  document.getElementById("configModal").style.display = "none";
}

function renderAdsTable() {
  const tbody = document.querySelector("#adsTable tbody");
  tbody.innerHTML = "";
  const yaActivos = loadAds().map(ad => ad.id);

  adsList
    .filter(ad => !yaActivos.includes(ad.id))
    .forEach((ad) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${ad.id}</td>
        <td>${ad.anuncio}</td>
        <td>${ad.cuenta}</td>
        <td>$${ad.cpc.toFixed(2)}</td>
        <td><button class="btn" onclick='openConfigModal(${JSON.stringify(ad)})'>Agregar</button></td>
      `;
      tbody.appendChild(row);
    });
}

function confirmAd() {
  const presupuesto = parseFloat(document.getElementById("inputPresupuesto").value);
  const api = document.getElementById("inputAPI").value;

  if (!presupuesto || !api) {
    alert("Por favor completá presupuesto y seleccioná API");
    return;
  }

  const newAd = {
    ...selectedAd,
    presupuesto,
    api,
    estado: 'ACTIVA',
    leads: 0,
    cargas: 0,
    gasto: 0
  };

  const ads = loadAds();
  ads.push(newAd);
  saveAds(ads);

  closeConfigModal();
  closeModal();
  renderServer4();
  renderDashboardResumen();
}

function renderServer4() {
  const tbody = document.querySelector("#server4Table tbody");
  tbody.innerHTML = "";

  const ads = loadAds();
  const activos = ads.filter(ad => ad.estado === 'ACTIVA');
  const inactivos = ads.filter(ad => ad.estado !== 'ACTIVA');

  // Activos
  activos.forEach((ad, i) => tbody.appendChild(renderAdRow(ad, i)));

  // Línea divisoria
  if (inactivos.length) {
    const sep = document.createElement("tr");
    sep.className = "divisor";
    sep.innerHTML = `<td colspan="15"></td>`;
    tbody.appendChild(sep);
  }

  // Inactivos
  inactivos.forEach((ad, i) => tbody.appendChild(renderAdRow(ad, i, true)));
}

function renderAdRow(ad, i, inactivo = false) {
  const gastoImp = ad.gasto * IMP;
  const conv = ad.leads > 0 ? (ad.cargas / ad.leads * 100) : 0;
  const precioLead = ad.leads > 0 ? (ad.gasto / ad.leads) : 0;
  const precioCarga = ad.cargas > 0 ? (ad.gasto / ad.cargas) : 0;
  const precioCargaImp = precioCarga * IMP;
  const tieneDatos = ad.leads > 0 || ad.cargas > 0 || ad.gasto > 0;

  const row = document.createElement("tr");
  row.className = inactivo && tieneDatos ? "inactivo" : "";

  const borrar = (!tieneDatos && ad.estado !== "ACTIVA")
    ? `<button class="delete-btn" onclick="deleteAd('${ad.id}')">X</button>` : "";

  row.innerHTML = `
    <td>${ad.id}</td>
    <td>${ad.cuenta}</td>
    <td>${ad.anuncio}</td>
    <td><input type="number" value="${ad.presupuesto}" onchange="updateAd(${i}, 'presupuesto', this.value)" /></td>
    <td>
      <select class="api" onchange="updateAd(${i}, 'api', this.value)">
        <option ${ad.api === 'VERONICA' ? 'selected' : ''}>VERONICA</option>
        <option ${ad.api === 'PERLA' ? 'selected' : ''}>PERLA</option>
        <option ${ad.api === 'MEREDITH' ? 'selected' : ''}>MEREDITH</option>
      </select>
    </td>
    <td>
      ${ad.estado === 'ACTIVA' ? '<span class="status-dot"></span>' : ''}
      <select class="estado" onchange="updateAd(${i}, 'estado', this.value)">
        <option ${ad.estado === 'ACTIVA' ? 'selected' : ''}>ACTIVA</option>
        <option ${ad.estado === 'INACTIVA' ? 'selected' : ''}>INACTIVA</option>
        <option ${ad.estado === 'CONVERTIR' ? 'selected' : ''}>CONVERTIR</option>
        <option ${ad.estado === 'RELANZAR' ? 'selected' : ''}>RELANZAR</option>
        <option ${ad.estado === 'ADS ERROR' ? 'selected' : ''}>ADS ERROR</option>
      </select>
    </td>
    <td><input type="number" value="${ad.leads}" onchange="updateAd(${i}, 'leads', this.value)" /></td>
    <td><input type="number" value="${ad.cargas}" onchange="updateAd(${i}, 'cargas', this.value)" /></td>
    <td><input type="number" value="${ad.gasto}" onchange="updateAd(${i}, 'gasto', this.value)" /></td>
    <td>$${gastoImp.toFixed(2)}</td>
    <td>${conv.toFixed(2)}%</td>
    <td>$${precioLead.toFixed(2)}</td>
    <td>$${precioCarga.toFixed(2)}</td>
    <td>$${precioCargaImp.toFixed(2)}</td>
    <td>${borrar}</td>
  `;
  return row;
}

function deleteAd(id) {
  const ads = loadAds().filter(ad => ad.id !== id);
  saveAds(ads);
  renderServer4();
  renderDashboardResumen();
}

function updateAd(index, field, value) {
  const ads = loadAds();
  ads[index][field] = field === 'api' || field === 'estado' ? value : parseFloat(value);
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
