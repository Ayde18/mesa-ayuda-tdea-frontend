// App.js

// CONSEJO: Reemplaza con la URL de tu backend .NET en Azure cuando lo tengas desplegado.
// Por ahora, para pruebas locales de la API, localhost está bien, pero para Vercel necesitarás la URL pública.
const API_BASE_URL = 'http://localhost:5000/api'; 

// --- UTILITIES ---
function getToken() {
    return localStorage.getItem('token');
}

function getUserId() {
    return localStorage.getItem('userId');
}

function getUserRoles() {
    try {
        return JSON.parse(localStorage.getItem('userRoles')) || [];
    } catch (e) {
        console.error("Error parsing user roles:", e);
        return [];
    }
}

function isUserLoggedIn() {
    return getToken() !== null;
}

function hasRole(role) {
    return getUserRoles().includes(role);
}

async function fetchData(url, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Something went wrong');
        }
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

// --- AUTHENTICATION (manteniendo funciones locales si las necesitas para registro/login tradicional) ---
// NOTA: handleLogin ya no será llamado por el botón de CAS, pero se mantiene si tienes un formulario local.
async function handleLogin(event) {
    // Esta función solo se usaría si tuvieras un formulario de login con email/password en tu HTML
    // Si la autenticación es solo por CAS, esta función no se ejecutará para el login principal.
    if (event) event.preventDefault(); // Asegura que event existe
    const email = document.getElementById('login-email')?.value; // Usar optional chaining
    const password = document.getElementById('login-password')?.value; // Usar optional chaining

    if (!email || !password) {
        alert('Por favor, ingresa tu correo y contraseña.');
        return;
    }

    try {
        const data = await fetchData(`${API_BASE_URL}/Auth/login`, 'POST', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userRoles', JSON.stringify(data.roles));
        localStorage.setItem('userName', data.nombreCompleto);
        alert('¡Inicio de sesión exitoso!');
        renderApp(); // Redibuja la interfaz
    } catch (error) {
        // Error ya manejado por fetchData, solo se muestra el alert
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const registerData = {
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        nombreCompleto: document.getElementById('register-nombrecompleto').value,
        numeroIdentificacion: document.getElementById('register-identificacion').value,
        numeroCelular: document.getElementById('register-celular').value,
        rolTdeA: document.getElementById('register-roltdea').value,
        sede: document.getElementById('register-sede').value,
        facultadDependencia: document.getElementById('register-facultad').value,
    };

    try {
        await fetchData(`${API_BASE_URL}/Auth/register`, 'POST', registerData);
        alert('¡Registro exitoso! Por favor, inicia sesión.');
        showLoginForm(); // Muestra el formulario de login (ahora con el botón CAS)
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

function handleLogout() {
    localStorage.clear();
    alert('Sesión cerrada.');
    renderApp();
}

// --- UI RENDERING ---
const appContentWrapper = document.getElementById('app-content-wrapper'); // Contenedor principal de main
const appContent = document.getElementById('app-content'); // Sección donde se renderiza el contenido dinámico
const headerNavLinks = document.getElementById('header-nav-links'); // Para la navegación del header

function showLoginForm() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const authSection = document.getElementById('auth-section');
    
    // Ocultar elementos de bienvenida si están presentes
    document.querySelector('.welcome-title')?.style.display = 'none';
    document.querySelector('.welcome-message')?.style.display = 'none';
    document.querySelector('.centered-tdea-logo')?.style.display = 'block'; // Mostrar logo central

    if (authSection) authSection.style.display = 'block';
    if (loginContainer) loginContainer.style.display = 'block';
    if (registerContainer) registerContainer.style.display = 'none';

    // Asegurarse de que el listener del botón CAS esté activo
    const casLoginButton = document.getElementById('cas-login-button');
    if (casLoginButton) {
        // Eliminar listener previo para evitar duplicados si la función se llama varias veces
        casLoginButton.removeEventListener('click', redirectToCasLogin); 
        casLoginButton.addEventListener('click', redirectToCasLogin);
    }
}

function showRegisterForm() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const authSection = document.getElementById('auth-section');

    // Ocultar elementos de bienvenida si están presentes
    document.querySelector('.welcome-title')?.style.display = 'none';
    document.querySelector('.welcome-message')?.style.display = 'none';
    document.querySelector('.centered-tdea-logo')?.style.display = 'block'; // Mostrar logo central

    if (authSection) authSection.style.display = 'block';
    if (loginContainer) loginContainer.style.display = 'none';
    if (registerContainer) registerContainer.style.display = 'block';

    // Asegurarse de que el listener del formulario de registro esté activo
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.removeEventListener('submit', handleRegister); // Evitar duplicados
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Redirecciona al CAS del TdeA
function redirectToCasLogin() {
    const casBaseUrl = 'https://campus.tdea.edu.co/cas/login';
    // ¡¡IMPORTANTE: Esta URL debe ser la URL de tu BACKEND que manejará el ticket de CAS!!
    // Por ejemplo: 'https://tu-dominio-de-backend.com/auth/cas/callback'
    // O, si tu backend es el mismo dominio que tu frontend (ej. si usas un proxy inverso en Vercel
    // o un despliegue monolítico), entonces la ruta sería algo como:
    // 'https://mesa-ayuda-tdea-frontend.vercel.app/api/cas_callback'
    // POR AHORA, para que el botón haga ALGO, usaré la URL de tu Vercel con una ruta de ejemplo.
    // ESTO SOLO FUNCIONARÁ PARA REDIRIGIR AL CAS, PERO NO PARA PROCESAR LA AUTENTICACIÓN COMPLETA SIN UN BACKEND.
    const serviceUrl = encodeURIComponent('https://mesa-ayuda-tdea-frontend.vercel.app/auth/cas/callback'); 
    
    const casLoginUrl = `${casBaseUrl}?service=${serviceUrl}`;
    window.location.href = casLoginUrl;
}


// Función principal para renderizar la aplicación
function renderApp() {
    // Limpiar navegación del header para reconstruirla
    if (headerNavLinks) headerNavLinks.innerHTML = ''; 

    // Aquí ya no limpiamos appContent.innerHTML completamente, sino que manejamos la visibilidad
    // de las secciones de autenticación, y App.js manejará el resto del contenido dinámico.

    if (!isUserLoggedIn()) {
        // Si el usuario NO está logueado, mostrar la sección de autenticación
        showLoginForm(); // Muestra el botón CAS y oculta el registro

        // Actualiza la navegación del header para mostrar Iniciar Sesión/Registro
        if (headerNavLinks) {
            headerNavLinks.innerHTML = `
                <li><a href="#" id="login-header-link">Iniciar sesión</a></li>
                <li><a href="#" id="register-header-link">Registro de usuarios</a></li>
            `;
            document.getElementById('login-header-link')?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
            document.getElementById('register-header-link')?.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
        }
        // Oculta otros contenidos que no son de autenticación
        document.getElementById('dashboard-view')?.style.display = 'none';
        document.getElementById('create-request-view')?.style.display = 'none';
        document.getElementById('my-requests-view')?.style.display = 'none';
        document.getElementById('request-detail-view')?.style.display = 'none';
        document.getElementById('admin-panel-view')?.style.display = 'none';
        document.getElementById('collab-panel-view')?.style.display = 'none';

        // Muestra el logo central
        document.querySelector('.centered-tdea-logo')?.style.display = 'block';
        // Oculta los mensajes de bienvenida (ya manejado en showLoginForm/showRegisterForm)
        document.querySelector('.welcome-title')?.style.display = 'none';
        document.querySelector('.welcome-message')?.style.display = 'none';


        // Esconder el footer al inicio de sesión (como en la imagen de TdeA)
        document.querySelector('.main-footer')?.style.display = 'none';

        return; // Detener la función aquí si no está logueado
    }

    // Si el usuario SÍ está logueado
    const authSection = document.getElementById('auth-section');
    if (authSection) authSection.style.display = 'none'; // Ocultar formularios de autenticación

    // Muestra el footer si el usuario está logueado y ve el resto de la app
    document.querySelector('.main-footer')?.style.display = 'block';

    // Oculta el logo central y los mensajes de bienvenida
    document.querySelector('.centered-tdea-logo')?.style.display = 'none';
    document.querySelector('.welcome-title')?.style.display = 'none';
    document.querySelector('.welcome-message')?.style.display = 'none';


    const userName = localStorage.getItem('userName') || 'Usuario';
    if (headerNavLinks) {
        headerNavLinks.innerHTML = `
            <li><span>Hola, ${userName}</span></li>
            ${hasRole('Solicitante') ? `<li><a href="#" id="nav-new-request">Nueva Solicitud</a></li>` : ''}
            <li><a href="#" id="nav-my-requests">Mis Solicitudes</a></li>
            ${hasRole('AdministradorCPM') ? `<li><a href="#" id="nav-admin-dashboard">Panel Admin</a></li>` : ''}
            ${hasRole('ColaboradorCPM') ? `<li><a href="#" id="nav-collab-dashboard">Mis Asignaciones</a></li>` : ''}
            <li><a href="#" id="nav-logout">Cerrar Sesión</a></li>
        `;

        // Event listeners para la navegación (asegúrate de que las funciones existan)
        if (hasRole('Solicitante')) {
            document.getElementById('nav-new-request')?.addEventListener('click', (e) => { e.preventDefault(); renderNewRequestForm(); });
        }
        document.getElementById('nav-my-requests')?.addEventListener('click', (e) => { e.preventDefault(); renderMyRequests(); });
        if (hasRole('AdministradorCPM')) {
            document.getElementById('nav-admin-dashboard')?.addEventListener('click', (e) => { e.preventDefault(); renderAdminDashboard(); });
        }
        if (hasRole('ColaboradorCPM')) {
            document.getElementById('nav-collab-dashboard')?.addEventListener('click', (e) => { e.preventDefault(); renderCollabDashboard(); });
        }
        document.getElementById('nav-logout').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    }

    // Redirigir a la vista por defecto al iniciar sesión
    if (hasRole('AdministradorCPM')) {
        renderAdminDashboard();
    } else if (hasRole('ColaboradorCPM')) {
        renderCollabDashboard();
    } else {
        renderMyRequests();
    }
}


// --- REQUESTS RENDERING ---

// Tus funciones renderMyRequests, renderNewRequestForm, handleNewRequestSubmit,
// renderAdminDashboard, renderCollabDashboard, renderSolicitudDetail,
// renderSolicitudActions, renderComments, openAssignModal, openRateModal,
// handleAssign, handleUpdateStatus, handleApproveReject, handleAddComment,
// handleReopen, handleRate van aquí, SIN CAMBIOS.

// --- MODAL FUNCTIONS (Mantener aquí) ---
async function openAssignModal(solicitudId) {
    const modal = document.getElementById('assign-modal');
    const select = document.getElementById('assign-colaborador-select');
    select.innerHTML = '<option value="">Selecciona un colaborador</option>'; // Reset

    try {
        const colaboradores = await fetchData(`${API_BASE_URL}/Solicitudes/colaboradores`);
        colaboradores.forEach(colaborador => {
            const option = document.createElement('option');
            option.value = colaborador.id;
            option.textContent = `${colaborador.nombreCompleto} (${colaborador.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        alert('Error al cargar colaboradores.');
        return;
    }

    modal.style.display = 'flex'; // Usar flex para centrar
    document.querySelector('#assign-modal .close-button').onclick = () => modal.style.display = 'none';
    document.getElementById('confirm-assign-btn').onclick = () => handleAssign(solicitudId, select.value);
}

async function openRateModal(solicitudId) {
    const modal = document.getElementById('rate-modal');
    modal.style.display = 'flex';
    document.querySelector('#rate-modal .close-button').onclick = () => modal.style.display = 'none';
    document.getElementById('confirm-rate-btn').onclick = () => handleRate(solicitudId);
}


// --- HANDLERS FOR ACTIONS (Mantener aquí) ---
async function handleAssign(solicitudId, colaboradorId) {
    if (!colaboradorId) {
        alert('Por favor, selecciona un colaborador.');
        return;
    }
    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/assign/${solicitudId}`, 'PUT', { colaboradorId: colaboradorId }); // Envía como objeto
        alert('Solicitud asignada exitosamente!');
        document.getElementById('assign-modal').style.display = 'none';
        renderSolicitudDetail(solicitudId); // Recargar detalles
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function handleUpdateStatus(solicitudId, newStatus) {
    const confirmUpdate = confirm(`¿Estás seguro de cambiar el estado a "${newStatus}"?`);
    if (!confirmUpdate) return;
    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/update-status/${solicitudId}`, 'PUT', { estado: newStatus }); // Envía como objeto
        alert(`Estado de solicitud actualizado a "${newStatus}"!`);
        renderSolicitudDetail(solicitudId);
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function handleApproveReject(solicitudId, action) {
    const comments = prompt(`Introduce comentarios para la ${action}ación:`);
    if (comments === null) return; // Si el usuario cancela
    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/${action}/${solicitudId}`, 'PUT', { comentarios: comments }); // Envía como objeto
        alert(`Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'}!`);
        renderSolicitudDetail(solicitudId);
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function handleAddComment(event, solicitudId) {
    event.preventDefault();
    const commentContent = document.getElementById('comment-content').value;
    if (!commentContent.trim()) {
        alert('El comentario no puede estar vacío.');
        return;
    }
    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/comment/${solicitudId}`, 'POST', { contenido: commentContent }); // Envía como objeto
        document.getElementById('comment-content').value = ''; // Limpiar textarea
        alert('Comentario añadido!');
        renderSolicitudDetail(solicitudId); // Recargar para mostrar el nuevo comentario
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function handleReopen(solicitudId) {
    const reopenComment = prompt('Por favor, ingresa el motivo para reabrir la solicitud:');
    if (!reopenComment) {
        alert('Debes proporcionar un motivo para reabrir la solicitud.');
        return;
    }
    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/reopen/${solicitudId}`, 'PUT', { motivoReapertura: reopenComment }); // Envía como objeto
        alert('Solicitud reabierta exitosamente!');
        renderSolicitudDetail(solicitudId);
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function handleRate(solicitudId) {
    const rating = parseInt(document.getElementById('rating-select').value);
    const comments = document.getElementById('rating-comments').value;

    if (isNaN(rating) || rating < 1 || rating > 5) {
        alert('Por favor, selecciona una calificación válida (1-5).');
        return;
    }

    try {
        await fetchData(`${API_BASE_URL}/Solicitudes/rate/${solicitudId}`, 'PUT', {
            calificacionServicio: rating,
            comentariosCalificacion: comments
        });
        alert('¡Servicio calificado exitosamente!');
        document.getElementById('rate-modal').style.display = 'none';
        renderSolicitudDetail(solicitudId);
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

// Initial render when the page loads
document.addEventListener('DOMContentLoaded', renderApp);
