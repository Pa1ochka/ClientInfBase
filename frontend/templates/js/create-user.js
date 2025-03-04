function initializeCreateUserListeners() {
    document.getElementById('create-user-btn').addEventListener('click', () => showSection('create-user-section'));

    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            email: document.getElementById('create-user-email').value,
            username: document.getElementById('create-user-username').value,
            password: document.getElementById('create-user-password').value
        };

        try {
            const response = await axios.post(`${API_URL}/users/`, userData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('create-user-message').textContent = 'Пользователь создан!';
            document.getElementById('create-user-message').classList.remove('error');
            document.getElementById('create-user-message').classList.add('success');
            document.getElementById('create-user-form').reset();
            showToast('Пользователь успешно создан', 'success');
        } catch (error) {
            const errorDetail = error.response?.data?.detail;
            document.getElementById('create-user-message').textContent = Array.isArray(errorDetail) 
                ? errorDetail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                : errorDetail || 'Ошибка создания пользователя';
            document.getElementById('create-user-message').classList.add('error');
        }
    });
}