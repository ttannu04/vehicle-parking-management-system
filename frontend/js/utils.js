// ============================================================
// Shared Utilities
// ============================================================

const API = "https://vehicle-parking-management-system-2-8cqz.onrender.com/api";

// ── Token Helpers ────────────────────────────────────────────
function getToken() {
    return localStorage.getItem("token");
}

function getUser() {
    try {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

function saveAuth(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

// ── Route Protection ─────────────────────────────────────────
function requireAuth() {

    if (!getToken()) {

        window.location.href = "login.html";
        return false;
    }

    return true;
}

function requireAdmin() {

    const user = getUser();

    if (!getToken() || !user || user.role !== "admin") {

        window.location.href = "login.html";
        return false;
    }

    return true;
}

// ── API Fetch Wrapper ────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {

    try {

        const token = getToken();

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        // Attach JWT token
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API}${endpoint}`, {
            ...options,
            headers
        });

        // Parse JSON safely
        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        // Unauthorized
        if (response.status === 401) {

            clearAuth();

            window.location.href = "login.html";

            return null;
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };

    } catch (err) {

        console.error("API Fetch Error:", err);

        return {
            ok: false,
            status: 500,
            data: {
                error: "Unable to connect to server"
            }
        };
    }
}

// ── Alert Helper ─────────────────────────────────────────────
function showAlert(elId, message, type = "success") {

    const el = document.getElementById(elId);

    if (!el) return;

    el.textContent = message;

    el.className = `alert alert-${type} show`;

    setTimeout(() => {
        el.classList.remove("show");
    }, 4000);
}

// ── Badge Helper ─────────────────────────────────────────────
function badge(status) {

    return `
        <span class="badge badge-${status}">
            ${status}
        </span>
    `;
}

// ── Date Formatter ───────────────────────────────────────────
function fmtDate(date) {

    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ── Currency Formatter ───────────────────────────────────────
function fmtMoney(amount) {

    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2
    });
}

// ── Button Loading State ─────────────────────────────────────
function setLoading(button, loading) {

    if (!button) return;

    if (loading) {

        button.dataset.originalText = button.innerHTML;

        button.innerHTML = `
            <span class="spinner"></span>
            Please wait...
        `;

        button.disabled = true;

    } else {

        button.innerHTML =
            button.dataset.originalText || "Submit";

        button.disabled = false;
    }
}