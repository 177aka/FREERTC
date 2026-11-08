const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwY4dFf7R8uF0mt73GLS8zXSjDSaZOZBsDLxxioO8Gwe8GexEBmMbghlYIEE6JRo_z5/exec";

let deviceId = localStorage.getItem('mcd_device_id');
if (!deviceId) {
  deviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('mcd_device_id', deviceId);
}

const lockScreen = document.getElementById('lockScreen');
const accessCodeInput = document.getElementById('accessCodeInput');
const unlockBtn = document.getElementById('unlockBtn');
const lockError = document.getElementById('lockError');
const loadingSteps = document.getElementById('loadingSteps');
const closeBtn = document.getElementById('closeBtn');

function checkEnvironment() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const pwaNotice = document.getElementById('pwaInstallNotice');
  const pwaInstructions = document.getElementById('pwaInstructions');

  // Si on est sur mobile et que l'app n'est PAS installée en mode application : afficher le tuto
  if (isMobile && !isStandalone) {
    if (pwaNotice) pwaNotice.classList.add('active');
    if (pwaInstructions) pwaInstructions.style.display = 'block';
    document.body.classList.add('locked');
    return false;
  }

  // Si c'est sur PC ou déjà installé sur mobile, on laisse passer sans bloquer
  if (pwaNotice) pwaNotice.classList.remove('active');
  document.body.classList.remove('locked');
  return true;
}

// On n'interrompt plus l'exécution par une erreur fatale, checkEnvironment gère l'affichage du tuto proprement
checkEnvironment();

// --- Anti-veille de l'écran (Wake Lock API) ---
let wakeLock = null;
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
  }
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    if (localStorage.getItem('platine_unlocked') === 'true') {
      await requestWakeLock();
    }
  }
});

function lockApp() {
  if (lockScreen) lockScreen.classList.remove('hidden');
  document.body.classList.add('locked');
  if (wakeLock) {
    wakeLock.release().then(() => { wakeLock = null; });
  }
}

function unlockApp() {
  if (lockScreen) lockScreen.classList.add('hidden');
  document.body.classList.remove('locked');
  requestWakeLock();
}

function showCustomModal(title, message, onConfirm, confirmText = "Confirmer") {
  const existingOverlay = document.getElementById('customModalOverlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'customModalOverlay';
  overlay.className = 'custom-modal-overlay';

  overlay.innerHTML = `
    <div class="custom-modal">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="custom-modal-actions">
        <button class="btn-cancel" id="modalCancelBtn">Annuler</button>
        <button class="btn-confirm-danger" id="modalConfirmBtn">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('modalCancelBtn').addEventListener('click', () => overlay.remove());
  document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
}

window.addEventListener('online', () => {
  const savedCode = localStorage.getItem('platine_used_code');
  if (localStorage.getItem('platine_unlocked') === 'true' && savedCode) {
    fetch(`${GOOGLE_SCRIPT_URL}?action=verify&code=${encodeURIComponent(savedCode)}&deviceId=${encodeURIComponent(deviceId)}`)
      .then(response => response.json())
      .then(data => {
        if (!data.valid) {
          localStorage.removeItem('platine_unlocked');
          localStorage.removeItem('platine_used_code');
          lockApp();
          if (lockError) lockError.textContent = "Connexion rétablie : Votre licence a expiré ou a été révoquée.";
        }
      })
      .catch(() => {});
  }
});

if (localStorage.getItem('platine_unlocked') === 'true') {
  const savedCode = localStorage.getItem('platine_used_code');
  if (savedCode && deviceId) {
    if(loadingSteps) loadingSteps.textContent = "Vérification de la licence...";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch(`${GOOGLE_SCRIPT_URL}?action=verify&code=${encodeURIComponent(savedCode)}&deviceId=${encodeURIComponent(deviceId)}`, { signal: controller.signal })
      .then(response => response.json())
      .then(data => {
        clearTimeout(timeoutId);
        if(loadingSteps) loadingSteps.textContent = "";
        if (!data.valid) {
          localStorage.removeItem('platine_unlocked');
          localStorage.removeItem('platine_used_code');
          lockApp();
          if (lockError) lockError.textContent = data.reason || "Licence expirée ou révoquée.";
        } else {
          unlockApp();
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if(loadingSteps) loadingSteps.textContent = "";
        unlockApp();
      });
  } else {
    localStorage.removeItem('platine_unlocked');
    lockApp();
  }
} else {
  lockApp();
}

if (unlockBtn) {
  unlockBtn.addEventListener('click', () => {
    const enteredCode = accessCodeInput.value.trim();
    if (!enteredCode) {
      lockError.textContent = "Veuillez entrer une licence valide.";
      return;
    }

    unlockBtn.disabled = true;
    unlockBtn.textContent = "Connexion...";
    lockError.textContent = "";
    if(loadingSteps) loadingSteps.textContent = "Connexion au serveur...";

    fetch(`${GOOGLE_SCRIPT_URL}?action=verify&code=${encodeURIComponent(enteredCode)}&deviceId=${encodeURIComponent(deviceId)}`)
      .then(response => response.json())
      .then(data => {
        unlockBtn.disabled = false;
        unlockBtn.textContent = "Déverrouiller";
        if(loadingSteps) loadingSteps.textContent = "";

        if (data.valid) {
          localStorage.setItem('platine_unlocked', 'true');
          localStorage.setItem('platine_used_code', enteredCode);
          unlockApp();
        } else {
          lockError.textContent = data.reason || "Licence invalide ou déjà utilisée sur un autre appareil.";
        }
      })
      .catch(() => {
        unlockBtn.disabled = false;
        unlockBtn.textContent = "Déverrouiller";
        if(loadingSteps) loadingSteps.textContent = "";
        lockError.textContent = "Erreur de connexion internet.";
      });
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const currentLicence = localStorage.getItem('platine_used_code') || "Aucune";
    
    const accountHTML = `
      <div class="modalites-text">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Bienvenue dans votre espace, <strong id="clientNameText" style="color: #c8102e;">Chargement...</strong>
        </p>
        
        <div class="account-box">
          <strong>Votre Licence active :</strong>
          <div class="licence-row">
            <span id="maskedLicence">••••••••••••••••</span>
            <button id="toggleLicenceBtn" type="button">Afficher</button>
          </div>
          <div class="warning-share">Ne partagez jamais votre licence (risque de révocation).</div>
        </div>

        <div class="account-box">
          <strong>État de l'abonnement :</strong>
          <div id="accountAlertBanner" style="display: none; margin-top: 8px; padding: 8px 10px; background-color: #ffebe9; border: 1px solid #d8232a; color: #d8232a; border-radius: 6px; font-size: 12px; font-weight: 700; text-align: center;"></div>
          <p style="margin: 6px 0 0 0; font-size:13px; color:#444;" id="subStatusText">Chargement...</p>
        </div>

        <div class="account-box">
          <strong>Tarifs & Support officiel :</strong>
          <p style="margin: 6px 0 0 0; font-size:13px;">
            • 1 Mois : 10 $<br>• 3 Mois : 15 $<br>• 6 Mois : 25 $<br>• 1 An : 35 $<br>• À Vie : 45 $<br><br>
            Contactez <a href="https://www.snapchat.com/add/ro.mailey" target="_blank" style="color: #d8232a; font-weight: bold; text-decoration: underline;">ro.mailey</a> sur Snapchat.
          </p>
        </div>

        <button class="danger-btn" id="logoutBtn">Se déconnecter de l'appareil</button>
      </div>
    `;

    openSubPage("Mon Compte", accountHTML);

    let isVisible = false;
    const toggleBtn = document.getElementById('toggleLicenceBtn');
    const maskedSpan = document.getElementById('maskedLicence');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isVisible = !isVisible;
        maskedSpan.textContent = isVisible ? currentLicence : "••••••••••••••••";
        toggleBtn.textContent = isVisible ? "Masquer" : "Afficher";
      });
    }

    const subStatusText = document.getElementById('subStatusText');
    const clientNameText = document.getElementById('clientNameText');
    const accountAlertBanner = document.getElementById('accountAlertBanner');

    fetch(`${GOOGLE_SCRIPT_URL}?action=verify&code=${encodeURIComponent(currentLicence)}&deviceId=${encodeURIComponent(deviceId)}`)
      .then(res => res.json())
      .then(data => {
        if (clientNameText) clientNameText.textContent = data.client ? data.client : "Utilisateur VIP";
        if (subStatusText && data.valid) {
          let expirationText = data.expDate === "À vie" ? "Accès permanent (À vie)" : `Expire le : ${data.expDate}`;
          subStatusText.innerHTML = `<span style="color: green; font-weight: bold;">● Licence active et valide</span><br><span>${expirationText}</span><br><small style="color: #666;">Appareil sécurisé.</small>`;
        }
      })
      .catch(() => {
        if (clientNameText) clientNameText.textContent = "Mode Hors-ligne";
        if (subStatusText) subStatusText.textContent = "Statut actif (Mode hors-ligne)";
      });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        showCustomModal("Déconnexion", "Voulez-vous vous déconnecter de cet appareil ?", () => {
          localStorage.removeItem('platine_unlocked');
          localStorage.removeItem('platine_used_code');
          window.location.reload();
        }, "Se déconnecter");
      });
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {});
  });
}

window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 300);
    }
  }, 400);
});

const mainView = document.getElementById('mainView');
const subView = document.getElementById('subView');
const pageTitle = document.getElementById('pageTitle');
const pageBody = document.getElementById('pageBody');
const backBtn = document.getElementById('backBtn');
const periodText = document.getElementById('periodText');

function openSubPage(title, contentHTML) {
  pageTitle.textContent = title;
  pageBody.innerHTML = contentHTML;
  mainView.classList.remove('active');
  subView.classList.add('active');
  window.scrollTo(0, 0);
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    subView.classList.remove('active');
    mainView.classList.add('active');
    window.scrollTo(0, 0);
  });
}

document.getElementById('modalitesLink').addEventListener('click', (e) => {
  e.preventDefault();
  openSubPage("Modalités de cette offre", `<div class="modalites-text"><p>Valable dans les restaurants McDonald's du Canada participants. Max 1 offre par transaction.</p></div>`);
});

document.getElementById('restaurantsLink').addEventListener('click', (e) => {
  e.preventDefault();
  openSubPage("Restaurants participants", `<div class="modalites-text"><p>Valable dans la grande majorité des restaurants McDonald's au Canada au comptoir.</p></div>`);
});

const cycleDays = ["Expire dans 3 jours", "Expire dans 2 jours", "Expire demain", "Expire aujourd'hui"];
let cycleIndex = parseInt(localStorage.getItem('platine_cycle_index')) || 0;
if (periodText) {
  periodText.textContent = `Période de l'offre : ${cycleDays[cycleIndex]}`;
  periodText.addEventListener('click', () => {
    cycleIndex = (cycleIndex + 1) % cycleDays.length;
    localStorage.setItem('platine_cycle_index', cycleIndex);
    periodText.textContent = `Période de l'offre : ${cycleDays[cycleIndex]}`;
  });
}