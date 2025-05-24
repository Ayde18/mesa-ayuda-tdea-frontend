const API_BASE_URL = 'http://localhost:5000/api'; // Reemplaza con la URL de tu backend .NET

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
        // Algunas respuestas pueden no tener cuerpo (ej. 204 No Content)
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

// --- AUTHENTICATION ---
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

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
        showLoginForm(); // Muestra el formulario de login
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
const appContent = document.getElementById('app-content');
const mainNav = document.getElementById('main-nav');
const authSection = document.getElementById('auth-section');

function renderApp() {
    mainNav.innerHTML = ''; // Limpiar navegación
    appContent.innerHTML = ''; // Limpiar contenido principal

    if (!isUserLoggedIn()) {
        // Mostrar formularios de autenticación
        authSection.style.display = 'block';
        appContent.appendChild(authSection);
        document.getElementById('login-form').addEventListener('submit', handleLogin);
        document.getElementById('register-form').addEventListener('submit', handleRegister);
        document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
        document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
        return;
    }

    authSection.style.display = 'none'; // Ocultar formularios de autenticación

    const userName = localStorage.getItem('userName') || 'Usuario';
    mainNav.innerHTML = `
        <li><span>Hola, ${userName}</span></li>
        ${hasRole('Solicitante') ? `<li><a href="#" id="nav-new-request">Nueva Solicitud</a></li>` : ''}
        <li><a href="#" id="nav-my-requests">Mis Solicitudes</a></li>
        ${hasRole('AdministradorCPM') ? `<li><a href="#" id="nav-admin-dashboard">Panel Admin</a></li>` : ''}
        ${hasRole('ColaboradorCPM') ? `<li><a href="#" id="nav-collab-dashboard">Mis Asignaciones</a></li>` : ''}
        <li><a href="#" id="nav-logout">Cerrar Sesión</a></li>
    `;

    // Event listeners para la navegación
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

    // Redirigir a la vista por defecto al iniciar sesión
    if (hasRole('AdministradorCPM')) {
        renderAdminDashboard();
    } else if (hasRole('ColaboradorCPM')) {
        renderCollabDashboard();
    } else {
        renderMyRequests();
    }
}

function showLoginForm() {
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('register-form-container').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
}

// --- REQUESTS RENDERING ---

async function renderMyRequests() {
    appContent.innerHTML = `
        <section class="dashboard-section">
            <h2>Mis Solicitudes</h2>
            <ul id="solicitudes-list"></ul>
        </section>
    `;
    const solicitudesList = document.getElementById('solicitudes-list');

    try {
        const solicitudes = await fetchData(`${API_BASE_URL}/Solicitudes`);
        if (solicitudes.length === 0) {
            solicitudesList.innerHTML = `<p>No tienes solicitudes aún. ¡Crea una nueva!</p>`;
            return;
        }
        solicitudes.forEach(solicitud => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <h4>${solicitud.numeroSolicitud} - ${solicitud.titulo}</h4>
                    <p>Formato: ${solicitud.formatoRequerido}</p>
                    <p>Fecha Solicitud: ${new Date(solicitud.fechaSolicitud).toLocaleDateString()}</p>
                </div>
                <span class="status <span class="math-inline">\{solicitud\.estado\.replace\(/\\s/g, ''\)\}"\></span>{solicitud.estado}</span>
                <button class="view-details-btn" data-id="${solicitud.id}">Ver Detalles</button>
            `;
            solicitudesList.appendChild(li);
        });

        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => renderSolicitudDetail(e.target.dataset.id));
        });

    } catch (error) {
        solicitudesList.innerHTML = `<p>Error al cargar solicitudes: ${error.message}</p>`;
    }
}

async function renderNewRequestForm() {
    appContent.innerHTML = `
        <section class="new-request-form-container">
            <h3>Crear Nueva Solicitud</h3>
            <form id="new-request-form">
                <label for="new-request-title">Título/Asunto:</label>
                <input type="text" id="new-request-title" required>

                <label for="new-request-description">Descripción Detallada:</label>
                <textarea id="new-request-description" rows="5"></textarea>

                <label for="new-request-format">Formato Requerido:</label>
                <select id="new-request-format" required>
                    <option value="">Seleccione un formato</option>
                    <option value="Video">Video</option>
                    <option value="Fotografia">Fotografía</option>
                    <option value="Transmision">Transmisión</option>
                    <option value="Cursos Virtuales">Cursos Virtuales</option>
                    <option value="Animacion">Animación</option>
                    <option value="Diseno Grafico">Diseño Gráfico</option>
                </select>

                <label for="new-request-fecha-evento">Fecha del Evento (si aplica):</label>
                <input type="date" id="new-request-fecha-evento">

                <label for="new-request-hora-evento">Hora del Evento (si aplica):</label>
                <input type="time" id="new-request-hora-evento">

                <label for="new-request-lugar-evento">Lugar del Evento (si aplica):</label>
                <input type="text" id="new-request-lugar-evento">

                <label for="new-request-facultad-origen">Facultad o Dependencia de Origen:</label>
                <input type="text" id="new-request-facultad-origen" value="${localStorage.getItem('userFacultadDependencia') || ''}" required>


                <button type="submit">Enviar Solicitud</button>
            </form>
        </section>
    `;
    document.getElementById('new-request-form').addEventListener('submit', handleNewRequestSubmit);
}

async function handleNewRequestSubmit(event) {
    event.preventDefault();
    const requestData = {
        titulo: document.getElementById('new-request-title').value,
        descripcion: document.getElementById('new-request-description').value,
        formatoRequerido: document.getElementById('new-request-format').value,
        fechaEvento: document.getElementById('new-request-fecha-evento').value || null,
        horaEvento: document.getElementById('new-request-hora-evento').value || null,
        lugarEvento: document.getElementById('new-request-lugar-evento').value,
        facultadOrigen: document.getElementById('new-request-facultad-origen').value
    };

    try {
        await fetchData(`${API_BASE_URL}/Solicitudes`, 'POST', requestData);
        alert('¡Solicitud creada exitosamente!');
        renderMyRequests(); // Vuelve a la lista de solicitudes
    } catch (error) {
        // Error ya manejado por fetchData
    }
}

async function renderAdminDashboard() {
    appContent.innerHTML = `
        <section class="dashboard-section">
            <h2>Panel de Administrador CPM</h2>
            <ul id="admin-solicitudes-list"></ul>
            <h3>Gestión de Colaboradores (simple)</h3>
            <div id="colaboradores-list"></div>
        </section>
    `;
    const solicitudesList = document.getElementById('admin-solicitudes-list');
    const colaboradoresDiv = document.getElementById('colaboradores-list');

    try {
        const solicitudes = await fetchData(`${API_BASE_URL}/Solicitudes`);
        if (solicitudes.length === 0) {
            solicitudesList.innerHTML = `<p>No hay solicitudes.</p>`;
        } else {
            solicitudes.forEach(solicitud => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <h4>${solicitud.numeroSolicitud} - ${solicitud.titulo}</h4>
                        <p>Solicitante: <span class="math-inline">\{solicitud\.solicitanteNombre\} \(</span>{solicitud.facultadOrigen})</p>
                        <p>Asignado a: ${solicitud.colaboradorAsignadoNombre || 'Nadie'}</p>
                    </div>
                    <span class="status <span class="math-inline">\{solicitud\.estado\.replace\(/\\s/g, ''\)\}"\></span>{solicitud.estado}</span>
                    <button class="view-details-btn" data-id="${solicitud.id}">Ver Detalles</button>
                `;
                solicitudesList.appendChild(li);
            });
            document.querySelectorAll('.view-details-btn').forEach(button => {
                button.addEventListener('click', (e) => renderSolicitudDetail(e.target.dataset.id));
            });
        }

        // Para la gestión de colaboradores, simplemente listarlos por ahora
        const colaboradores = await fetchData(`${API_BASE_URL}/Solicitudes/colaboradores`);
        if (colaboradores.length > 0) {
            colaboradoresDiv.innerHTML = '<h4>Colaboradores Actuales:</h4><ul>' +
                colaboradores.map(c => `<li><span class="math-inline">\{c\.nombreCompleto\} \(</span>{c.email})</li>`).join('') +
                '</ul>';
        } else {
            colaboradoresDiv.innerHTML = '<p>No hay colaboradores registrados. Asegúrate de crear usuarios con rol "ColaboradorCPM".</p>';
        }

    } catch (error) {
        solicitudesList.innerHTML = `<p>Error al cargar el panel de administrador: ${error.message}</p>`;
    }
}

async function renderCollabDashboard() {
    appContent.innerHTML = `
        <section class="dashboard-section">
            <h2>Mis Asignaciones (Colaborador CPM)</h2>
            <ul id="collab-solicitudes-list"></ul>
        </section>
    `;
    const solicitudesList = document.getElementById('collab-solicitudes-list');

    try {
        const solicitudes = await fetchData(`${API_BASE_URL}/Solicitudes`); // Esta API ya filtra por rol
        if (solicitudes.length === 0) {
            solicitudesList.innerHTML = `<p>No tienes solicitudes asignadas.</p>`;
            return;
        }
        solicitudes.forEach(solicitud => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <h4>${solicitud.numeroSolicitud} - ${solicitud.titulo}</h4>
                    <p>Solicitante: ${solicitud.solicitanteNombre}</p>
                    <p>Formato: ${solicitud.formatoRequerido}</p>
                </div>
                <span class="status <span class="math-inline">\{solicitud\.estado\.replace\(/\\s/g, ''\)\}"\></span>{solicitud.estado}</span>
                <button class="view-details-btn" data-id="${solicitud.id}">Ver Detalles</button>
            `;
            solicitudesList.appendChild(li);
        });

        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => renderSolicitudDetail(e.target.dataset.id));
        });

    } catch (error) {
        solicitudesList.innerHTML = `<p>Error al cargar asignaciones: ${error.message}</p>`;
    }
}


async function renderSolicitudDetail(id) {
    appContent.innerHTML = `
        <section class="solicitud-detail">
            <button onclick="history.back()">Volver</button>
            <h3 id="solicitud-detail-title">Cargando...</h3>
            <p><strong>Número de Solicitud:</strong> <span id="detail-numero"></span></p>
            <p><strong>Estado:</strong> <span id="detail-estado" class="status"></span></p>
            <p><strong>Fecha Solicitud:</strong> <span id="detail-fecha-solicitud"></span></p>
            <p><strong>Solicitante:</strong> <span id="detail-solicitante"></span> (<span id="detail-solicitante-email"></span>)</p>
            <p><strong>Facultad/Dependencia:</strong> <span id="detail-facultad-origen"></span></p>
            <p><strong>Formato Requerido:</strong> <span id="detail-formato"></span></p>
            <p><strong>Descripción:</strong> <span id="detail-descripcion"></span></p>
            <p><strong>Fecha del Evento:</strong> <span id="detail-fecha-evento"></span></p>
            <p><strong>Hora del Evento:</strong> <span id="detail-hora-evento"></span></p>
            <p><strong>Lugar del Evento:</strong> <span id="detail-lugar-evento"></span></p>
            <p><strong>Asignado a:</strong> <span id="detail-colaborador-asignado"></span></p>
            <p><strong>Calificación:</strong> <span id="detail-calificacion"></span></p>
            <p><strong>Comentarios Calificación:</strong> <span id="detail-comentarios-calificacion"></span></p>

            <div class="actions" id="solicitud-actions">
                </div>

            <div class="comments-section">
                <h4>Comentarios</h4>
                <div id="comments-list"></div>
                <form id="add-comment-form">
                    <textarea id="comment-content" rows="3" placeholder="Añadir un comentario..."></textarea>
                    <button type="submit" class="btn-comment">Añadir Comentario</button>
                </form>
            </div>

            <div id="assign-modal" class="modal">
                <div class="modal-content">
                    <span class="close-button">&times;</span>
                    <h4>Asignar Solicitud</h4>
                    <select id="assign-colaborador-select">
                        <option value="">Selecciona un colaborador</option>
                    </select>
                    <button id="confirm-assign-btn">Asignar</button>
                </div>
            </div>

             <div id="rate-modal" class="modal">
                <div class="modal-content">
                    <span class="close-button">&times;</span>
                    <h4>Calificar Servicio</h4>
                    <label for="rating-select">Calificación (1-5):</label>
                    <select id="rating-select">
                        <option value="1">1 Estrella</option>
                        <option value="2">2 Estrellas</option>
                        <option value="3">3 Estrellas</option>
                        <option value="4">4 Estrellas</option>
                        <option value="5">5 Estrellas</option>
                    </select>
                    <label for="rating-comments">Comentarios:</label>
                    <textarea id="rating-comments" rows="3"></textarea>
                    <button id="confirm-rate-btn">Enviar Calificación</button>
                </div>
            </div>

        </section>
    `;

    try {
        const solicitud = await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/</span>{id}`);
        document.getElementById('solicitud-detail-title').textContent = solicitud.titulo;
        document.getElementById('detail-numero').textContent = solicitud.numeroSolicitud;
        const estadoSpan = document.getElementById('detail-estado');
        estadoSpan.textContent = solicitud.estado;
        estadoSpan.className = `status ${solicitud.estado.replace(/\s/g, '')}`;
        document.getElementById('detail-fecha-solicitud').textContent = new Date(solicitud.fechaSolicitud).toLocaleDateString();
        document.getElementById('detail-solicitante').textContent = solicitud.solicitanteNombre;
        document.getElementById('detail-solicitante-email').textContent = solicitud.solicitanteEmail;
        document.getElementById('detail-facultad-origen').textContent = solicitud.facultadOrigen;
        document.getElementById('detail-formato').textContent = solicitud.formatoRequerido;
        document.getElementById('detail-descripcion').textContent = solicitud.descripcion;
        document.getElementById('detail-fecha-evento').textContent = solicitud.fechaEvento ? new Date(solicitud.fechaEvento).toLocaleDateString() : 'N/A';
        document.getElementById('detail-hora-evento').textContent = solicitud.horaEvento || 'N/A';
        document.getElementById('detail-lugar-evento').textContent = solicitud.lugarEvento || 'N/A';
        document.getElementById('detail-colaborador-asignado').textContent = solicitud.colaboradorAsignadoNombre || 'No asignado';
        document.getElementById('detail-calificacion').textContent = solicitud.calificacionServicio ? `${solicitud.calificacionServicio} estrellas` : 'N/A';
        document.getElementById('detail-comentarios-calificacion').textContent = solicitud.comentariosCalificacion || 'Sin comentarios';


        renderSolicitudActions(solicitud);
        renderComments(solicitud.comentarios);

        document.getElementById('add-comment-form').addEventListener('submit', (e) => handleAddComment(e, solicitud.id));

    } catch (error) {
        appContent.innerHTML = `<p>Error al cargar los detalles de la solicitud: ${error.message}</p>`;
    }
}

function renderSolicitudActions(solicitud) {
    const actionsDiv = document.getElementById('solicitud-actions');
    actionsDiv.innerHTML = ''; // Limpiar acciones previas

    const currentUserRoles = getUserRoles();
    const currentUserId = getUserId();

    // Acciones para Administrador CPM
    if (currentUserRoles.includes('AdministradorCPM')) {
        if (solicitud.estado === 'Recibido' || solicitud.estado === 'Pendiente' || solicitud.estado === 'Reabierta') {
            const assignBtn = document.createElement('button');
            assignBtn.textContent = 'Asignar Colaborador';
            assignBtn.className = 'btn-assign';
            assignBtn.addEventListener('click', () => openAssignModal(solicitud.id));
            actionsDiv.appendChild(assignBtn);
        }
        if (solicitud.estado === 'Resuelto' || solicitud.estado === 'Devuelta para correcciones') {
            const approveBtn = document.createElement('button');
            approveBtn.textContent = 'Aprobar Solicitud';
            approveBtn.className = 'btn-approve';
            approveBtn.addEventListener('click', () => handleApproveReject(solicitud.id, 'approve'));
            actionsDiv.appendChild(approveBtn);

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Rechazar Solicitud';
            rejectBtn.className = 'btn-reject';
            rejectBtn.addEventListener('click', () => handleApproveReject(solicitud.id, 'reject'));
            actionsDiv.appendChild(rejectBtn);

            const returnForCorrectionBtn = document.createElement('button');
            returnForCorrectionBtn.textContent = 'Devolver para Correcciones';
            returnForCorrectionBtn.className = 'btn-reject'; // Puedes usar otro color si quieres
            returnForCorrectionBtn.addEventListener('click', () => handleUpdateStatus(solicitud.id, 'Devuelta para correcciones'));
            actionsDiv.appendChild(returnForCorrectionBtn);
        }
    }

    // Acciones para Colaborador CPM
    if (currentUserRoles.includes('ColaboradorCPM') && solicitud.colaboradorAsignadoId === currentUserId) {
        if (solicitud.estado === 'Asignada' || solicitud.estado === 'Devuelta para correcciones') {
            const processBtn = document.createElement('button');
            processBtn.textContent = 'Marcar En Proceso';
            processBtn.className = 'btn-process';
            processBtn.addEventListener('click', () => handleUpdateStatus(solicitud.id, 'En proceso'));
            actionsDiv.appendChild(processBtn);
        }
        if (solicitud.estado === 'En proceso') {
            const resolveBtn = document.createElement('button');
            resolveBtn.textContent = 'Marcar Resuelta';
            resolveBtn.className = 'btn-resolve';
            resolveBtn.addEventListener('click', () => handleUpdateStatus(solicitud.id, 'Resuelto'));
            actionsDiv.appendChild(resolveBtn);
        }
    }

    // Acciones para Solicitante
    if (currentUserRoles.includes('Solicitante') && solicitud.solicitanteId === currentUserId) {
        if (solicitud.estado === 'Resuelto' || solicitud.estado === 'Aprobada' || solicitud.estado === 'Rechazada') {
            const reopenBtn = document.createElement('button');
            reopenBtn.textContent = 'Reabrir Solicitud';
            reopenBtn.className = 'btn-reopen';
            reopenBtn.addEventListener('click', () => handleReopen(solicitud.id));
            actionsDiv.appendChild(reopenBtn);

            if (!solicitud.calificacionServicio) { // Si aún no ha calificado
                const rateBtn = document.createElement('button');
                rateBtn.textContent = 'Calificar Servicio';
                rateBtn.className = 'btn-rate';
                rateBtn.addEventListener('click', () => openRateModal(solicitud.id));
                actionsDiv.appendChild(rateBtn);
            }
        }
    }
}

function renderComments(comments) {
    const commentsListDiv = document.getElementById('comments-list');
    commentsListDiv.innerHTML = '';
    if (comments && comments.length > 0) {
        comments.forEach(comment => {
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <p><strong>${comment.usuarioNombre}:</strong> <span class="math-inline">\{comment\.contenido\}</p\>
<small>{new Date(comment.fechaCreacion).toLocaleString()}</small>
`;
commentsListDiv.appendChild(div);
});
} else {
commentsListDiv.innerHTML = '<p>No hay comentarios aún.</p>';
}
}

// --- MODAL FUNCTIONS ---
async function openAssignModal(solicitudId) {
    const modal = document.getElementById('assign-modal');
    const select = document.getElementById('assign-colaborador-select');
    select.innerHTML = '<option value="">Selecciona un colaborador</option>'; // Reset

    try {
        const colaboradores = await fetchData(`${API_BASE_URL}/Solicitudes/colaboradores`);
        colaboradores.forEach(colaborador => {
            const option = document.createElement('option');
            option.value = colaborador.id;
            option.textContent = `<span class="math-inline">\{colaborador\.nombreCompleto\}</69\> \(</span>{colaborador.email})`;
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


// --- HANDLERS FOR ACTIONS ---
async function handleAssign(solicitudId, colaboradorId) {
    if (!colaboradorId) {
        alert('Por favor, selecciona un colaborador.');
        return;
    }
    try {
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/assign/</span>{solicitudId}`, 'PUT', colaboradorId);
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
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/update\-status/</span>{solicitudId}`, 'PUT', newStatus);
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
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/</span>{action}/${solicitudId}`, 'PUT', comments);
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
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/comment/</span>{solicitudId}`, 'POST', commentContent);
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
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/reopen/</span>{solicitudId}`, 'PUT', reopenComment);
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
        await fetchData(`<span class="math-inline">\{API\_BASE\_URL\}/Solicitudes/rate/</span>{solicitudId}`, 'PUT', {
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