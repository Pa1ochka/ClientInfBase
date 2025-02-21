function initializeProfileListeners() {
    document.getElementById('profile-btn').addEventListener('click', async () => {
        try {
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = response.data;

            // Заполняем данные для просмотра
            document.getElementById('profile-view-email').textContent = user.email;
            document.getElementById('profile-view-username').textContent = user.username;

            // Заполняем поля формы для редактирования
            document.getElementById('profile-email').value = user.email;
            document.getElementById('profile-username').value = user.username;
            document.getElementById('profile-current-password').value = '';

            // Показываем режим просмотра и скрываем форму
            document.getElementById('profile-view').style.display = 'block';
            document.getElementById('profile-edit-form').style.display = 'none';

            document.getElementById('profile-modal').style.display = 'flex';
        } catch (error) {
            console.error('Ошибка получения профиля:', error.response?.data?.detail || error.message);
            document.getElementById('profile-message').textContent = error.response?.data?.detail || 'Ошибка загрузки профиля';
            document.getElementById('profile-message').classList.add('error');
        }
    });

    document.getElementById('profile-close-modal').addEventListener('click', () => {
        document.getElementById('profile-modal').style.display = 'none';
        document.getElementById('profile-message').textContent = '';
        document.getElementById('profile-message').classList.remove('error', 'success');
    });

    document.getElementById('profile-edit-btn').addEventListener('click', () => {
        // Переключаемся в режим редактирования
        document.getElementById('profile-view').style.display = 'none';
        document.getElementById('profile-edit-form').style.display = 'block';
        document.getElementById('profile-password-group').style.display = 'block';
    });

    document.getElementById('profile-cancel-btn').addEventListener('click', () => {
        // Возвращаемся в режим просмотра
        document.getElementById('profile-edit-form').style.display = 'none';
        document.getElementById('profile-view').style.display = 'block';
        document.getElementById('profile-message').textContent = '';
        document.getElementById('profile-message').classList.remove('error', 'success');
    });

    document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('profile-current-password').value;

        const userData = {
            email: document.getElementById('profile-email').value,
            username: document.getElementById('profile-username').value,
            current_password: currentPassword
        };

        try {
            const response = await axios.put(`${API_URL}/users/me`, userData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('profile-message').textContent = 'Профиль обновлён!';
            document.getElementById('profile-message').classList.remove('error');
            document.getElementById('profile-message').classList.add('success');
            document.getElementById('profile-modal').style.display = 'none';
            currentUsername = response.data.username;
            document.getElementById('current-user').textContent = `${currentUsername}`;
        } catch (error) {
            const errorDetail = error.response?.data?.detail;
            if (Array.isArray(errorDetail)) {
                const errorMessages = errorDetail.map(err => {
                    const field = err.loc[err.loc.length - 1];
                    const msg = err.msg;
                    const requirements = {
                        email: 'Корректный email (должен содержать @)',
                        username: 'От 3 до 50 символов',
                        current_password: 'Текущий пароль (обязательно)'
                    };
                    return `${field}: ${msg} (Требование: ${requirements[field] || 'Неизвестно'})`;
                });
                document.getElementById('profile-message').textContent = errorMessages.join(', ');
            } else {
                document.getElementById('profile-message').textContent = errorDetail || 'Ошибка обновления профиля';
            }
            document.getElementById('profile-message').classList.add('error');
        }
    });
}