function initializeProfileListeners() {
    document.getElementById('profile-btn').addEventListener('click', async () => {
        try {
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = response.data;

            // Заполнение данных профиля
            document.getElementById('profile-view-username').textContent = user.username;
            document.getElementById('profile-view-email').textContent = user.email;
            document.getElementById('profile-view-role').textContent = user.is_admin ? 'Администратор' : 'Пользователь';
            document.getElementById('profile-view-created').textContent = new Date(user.created_at).toLocaleDateString();
            document.getElementById('profile-avatar-img').src = user.avatar_url || '/static/img/default-avatar.png';

            // Заполнение формы редактирования
            document.getElementById('profile-email').value = user.email;
            document.getElementById('profile-username').value = user.username;

            toggleProfileSection('profile-view');
            showModal('profile-modal');
        } catch (error) {
            showError('profile-message', error);
        }
    });

    document.getElementById('profile-close-modal').addEventListener('click', () => hideModal('profile-modal'));

    document.getElementById('profile-edit-btn').addEventListener('click', () => toggleProfileSection('profile-edit-form'));
    document.getElementById('profile-password-btn').addEventListener('click', () => toggleProfileSection('profile-password-form'));

    document.getElementById('profile-cancel-btn').addEventListener('click', () => toggleProfileSection('profile-view'));
    document.getElementById('profile-password-cancel-btn').addEventListener('click', () => toggleProfileSection('profile-view'));

    document.getElementById('profile-avatar-edit').addEventListener('click', () => {
        document.getElementById('profile-avatar-upload').click();
    });

    document.getElementById('profile-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const response = await axios.post(`${API_URL}/users/me/avatar`, formData, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
                document.getElementById('profile-avatar-img').src = response.data.avatar_url;
                showToast('Аватар обновлен', 'success');
            } catch (error) {
                showError('profile-message', error);
            }
        }
    });

    document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            email: document.getElementById('profile-email').value,
            username: document.getElementById('profile-username').value,
            current_password: document.getElementById('profile-current-password').value
        };
        try {
            const response = await axios.put(`${API_URL}/users/me`, userData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            updateProfileView(response.data);
            toggleProfileSection('profile-view');
            showToast('Профиль обновлен', 'success');
        } catch (error) {
            showError('profile-message', error);
        }
    });

    document.getElementById('profile-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('profile-old-password').value;
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (newPassword !== confirmPassword) {
            document.getElementById('profile-message').textContent = 'Пароли не совпадают';
            document.getElementById('profile-message').classList.add('error');
            return;
        }

        try {
            await axios.put(`${API_URL}/users/me/password`, {
                old_password: oldPassword,
                new_password: newPassword
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            toggleProfileSection('profile-view');
            showToast('Пароль обновлен', 'success');
        } catch (error) {
            showError('profile-message', error);
        }
    });
}

function toggleProfileSection(activeSectionId) {
    const sections = ['profile-view', 'profile-edit-form', 'profile-password-form'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        section.style.display = id === activeSectionId ? 'block' : 'none';
    });
    document.getElementById('profile-message').textContent = '';
    document.getElementById('profile-message').classList.remove('error', 'success');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function updateProfileView(user) {
    document.getElementById('profile-view-username').textContent = user.username;
    document.getElementById('profile-view-email').textContent = user.email;
    document.getElementById('current-user').textContent = user.username;
}

function showError(elementId, error) {
    const message = document.getElementById(elementId);
    message.textContent = error.response?.data?.detail || 'Ошибка выполнения запроса';
    message.classList.add('error');
}