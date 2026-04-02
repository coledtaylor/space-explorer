// Surface interaction module — scan/sample actions, science point tracking

const SUBTYPE_DATA = {
  'Rocky': {
    scanPoints: 10,
    scanText: 'Spectrographic analysis complete. Surface composed of silicate rock and metallic oxides. Moderate mineral concentration detected.',
    sampleText: 'Mineral analysis: High silica content with traces of iron oxide. Feldspar and quartz veins present throughout the sample matrix.',
  },
  'Ice World': {
    scanPoints: 20,
    scanText: 'Cryogenic surface scan complete. Deep ice layers detected with subsurface liquid water signatures. Unusual isotope ratios noted.',
    sampleText: 'Core sample extracted. Ice layers show distinct strata indicating periodic warming cycles. Trace organic compounds detected at depth.',
  },
  'Volcanic': {
    scanPoints: 30,
    scanText: 'Thermal scan complete. Active lava flows detected beneath hardened basalt crust. Sulfur dioxide venting at multiple sites.',
    sampleText: 'Thermal reading: Surface temperature 480K at sample site. Basalt composition with olivine inclusions. Geothermal gradient extreme.',
  },
  'Ocean World': {
    scanPoints: 25,
    scanText: 'Hydrological scan complete. Global ocean depth exceeds 40km. Chemical composition suggests high salinity and dissolved mineral content.',
    sampleText: 'Depth probe deployed. Bioluminescent signatures detected at 200m. Water column shows complex chemical gradients and unusual density layers.',
  },
  'Lush': {
    scanPoints: 15,
    scanText: 'Biosignature scan complete. Dense organic signatures across the surface. Atmospheric oxygen ratio 22%. Complex ecosystem detected.',
    sampleText: 'Bio sample collected. Cellular structures unlike known life — novel amino acid chains present. Rapid metabolic activity confirmed.',
  },
  'Desert': {
    scanPoints: 10,
    scanText: 'Geological survey complete. Arid surface with ancient erosion patterns. Atmospheric pressure minimal. Fossil river channels mapped.',
    sampleText: 'Geological survey: Sedimentary layers indicating ancient ocean bed. Fossilized microbial mats in lower strata. Windblown particulate samples collected.',
  },
  'Moon': {
    scanPoints: 5,
    scanText: 'Regolith scan complete. Heavily cratered surface with ancient impact basins. Low magnetic field. Solar wind implantation detected in topsoil.',
    sampleText: 'Regolith sample collected. Fine-grained ejecta mixed with micrometeorite fragments. Glassy impact spherules throughout the sample.',
  },
};

const DEFAULT_SUBTYPE_DATA = {
  scanPoints: 8,
  scanText: 'Scan complete. Surface composition logged.',
  sampleText: 'Sample collected. Analysis pending.',
};

// Module-level science state
let sciencePoints = 0;
const scannedKeys = new Set();

// Currently displayed body context
let _currentBody = null;
let _currentSeed = 0;

export function showSurfacePanel(body, systemSeed) {
  _currentBody = body;
  _currentSeed = systemSeed;

  const panel = document.getElementById('surface-panel');
  const nameEl = document.getElementById('surface-body-name');
  const typeEl = document.getElementById('surface-body-type');
  const descEl = document.getElementById('surface-body-desc');
  const resultEl = document.getElementById('surface-result');
  const scanBtn = document.getElementById('surface-scan-btn');
  const sampleBtn = document.getElementById('surface-sample-btn');

  // Populate body info
  nameEl.textContent = body.name;
  typeEl.textContent = body.subtype || body.kind;
  descEl.textContent = body.description || '';
  resultEl.textContent = '';

  // Replace button handlers to avoid duplicate listeners
  const newScanBtn = scanBtn.cloneNode(true);
  scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
  const newSampleBtn = sampleBtn.cloneNode(true);
  sampleBtn.parentNode.replaceChild(newSampleBtn, sampleBtn);

  newScanBtn.onclick = function() { handleScan(body, systemSeed); };
  newSampleBtn.onclick = function() { handleSample(body); };

  panel.classList.remove('hidden');
}

export function hideSurfacePanel() {
  const panel = document.getElementById('surface-panel');
  panel.classList.add('hidden');
  _currentBody = null;
}

export function getScience() {
  return sciencePoints;
}

export function isScanned(bodyName, systemSeed) {
  const key = systemSeed + ':' + bodyName;
  return scannedKeys.has(key);
}

function handleScan(body, systemSeed) {
  const resultEl = document.getElementById('surface-result');
  const key = systemSeed + ':' + body.name;

  if (scannedKeys.has(key)) {
    resultEl.textContent = 'Already Scanned.';
    resultEl.className = 'result-repeat';
    return;
  }

  const data = SUBTYPE_DATA[body.subtype] || DEFAULT_SUBTYPE_DATA;
  scannedKeys.add(key);
  sciencePoints += data.scanPoints;

  resultEl.textContent = data.scanText;
  resultEl.className = 'result-scan';

  // Update science display immediately
  const scienceDisplay = document.getElementById('science-display');
  if (scienceDisplay) {
    scienceDisplay.textContent = 'Science: ' + sciencePoints;
  }
}

function handleSample(body) {
  const resultEl = document.getElementById('surface-result');
  const data = SUBTYPE_DATA[body.subtype] || DEFAULT_SUBTYPE_DATA;

  resultEl.textContent = data.sampleText;
  resultEl.className = 'result-sample';
}
