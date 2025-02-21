function initializeAuthListeners() {
    document.getElementById('auth-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-login-email').value;
        const password = document.getElementById('auth-login-password').value;

        try {
            const response = await axios.post(`${API_URL}/token`, new URLSearchParams({
                username: email,
                password: password
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            token = response.data.access_token;
            localStorage.setItem('token', token);
            await fetchCurrentUser();
            document.getElementById('auth-message').textContent = 'Успешный вход!';
            document.getElementById('auth-message').classList.remove('error');
            document.getElementById('auth-message').classList.add('success');
            showManagementSection();
            showSection('clients-section');
        } catch (error) {
            document.getElementById('auth-message').textContent = error.response?.data?.detail || 'Ошибка входа';
            document.getElementById('auth-message').classList.add('error');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        token = null;
        currentUsername = null;
        localStorage.removeItem('token');
        const sections = ['create-user-section', 'create-client-section', 'clients-section'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.style.display = 'none';
            }
        });
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('sidebar-nav').style.display = 'none';
        document.getElementById('auth-message').textContent = '';
        document.getElementById('auth-message').classList.remove('error', 'success');
    });

    document.getElementById('auth-forgot-password-btn').addEventListener('click', async () => {
        const email = document.getElementById('auth-login-email').value;
        if (!email) {
            document.getElementById('auth-message').textContent = 'Введите email для восстановления пароля';
            document.getElementById('auth-message').classList.add('error');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/forgot-password`, { email });
            document.getElementById('auth-message').textContent = 'Временный код отправлен на вашу почту';
            document.getElementById('auth-message').classList.remove('error');
            document.getElementById('auth-message').classList.add('success');

            const resetForm = `
                <div class="input-group">
                    <input type="text" id="auth-reset-code" placeholder="Введите код" required>
                    <span class="material-icons">code</span>
                </div>
                <div class="input-group">
                    <input type="password" id="auth-new-password" placeholder="Новый пароль" required>
                    <span class="material-icons">lock</span>
                </div>
                <button type="button" id="auth-reset-submit-btn" class="btn btn-primary">Сбросить пароль</button>
            `;
            document.getElementById('auth-login-form').innerHTML += resetForm;

            document.getElementById('auth-reset-submit-btn').addEventListener('click', async () => {
                const code = document.getElementById('auth-reset-code').value;
                const newPassword = document.getElementById('auth-new-password').value;

                try {
                    await axios.post(`${API_URL}/reset-password`, { email, code, new_password: newPassword });
                    document.getElementById('auth-message').textContent = 'Пароль успешно сброшен';
                    document.getElementById('auth-message').classList.remove('error');
                    document.getElementById('auth-message').classList.add('success');
                    document.getElementById('auth-login-form').innerHTML = `
                        <div class="input-group">
                            <input type="email" id="auth-login-email" placeholder="Email" required>
                            <span class="material-icons">email</span>
                        </div>
                        <div class="input-group">
                            <input type="password" id="auth-login-password" placeholder="Пароль" required>
                            <span class="material-icons">vpn_key</span>
                        </div>
                        <button type="submit" class="btn btn-primary">Войти</button>
                        <button type="button" id="auth-forgot-password-btn" class="btn btn-secondary">Забыл пароль</button>
                    `;
                    initializeAuthListeners();
                } catch (error) {
                    document.getElementById('auth-message').textContent = error.response?.data?.detail || 'Ошибка сброса пароля';
                    document.getElementById('auth-message').classList.add('error');
                }
            });
        } catch (error) {
            document.getElementById('auth-message').textContent = error.response?.data?.detail || 'Ошибка отправки кода';
            document.getElementById('auth-message').classList.add('error');
        }
    });
}

function updateSidebarMenu() {
    fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(user => {
        const isAdmin = user.is_admin;
        document.getElementById('create-user-btn').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('create-client-btn').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('clients-btn').style.display = 'flex'; // Всегда видно
        document.getElementById('profile-btn').style.display = 'flex'; // Всегда видно
        document.getElementById('logout-btn').style.display = 'flex';  // Всегда видно
    })
    .catch(error => {
        console.error('Ошибка получения данных пользователя:', error);
    });
}