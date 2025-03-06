function initializeCreateUserListeners() {
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
            showSection('create-user-section');
            if (token && token !== 'null') loadUsers();
        });
    }

    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                email: document.getElementById('create-user-email').value,
                username: document.getElementById('create-user-username').value,
                password: document.getElementById('create-user-password').value,
                department: document.getElementById('create-user-department').value
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
                loadUsers();
            } catch (error) {
                const errorDetail = error.response?.data?.detail;
                document.getElementById('create-user-message').textContent = Array.isArray(errorDetail)
                    ? errorDetail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                    : errorDetail || 'Ошибка создания пользователя';
                document.getElementById('create-user-message').classList.add('error');
            }
        });
    }

    if (token && token !== 'null') loadUsers();
}

async function loadUsers() {
    const loadingRow = document.getElementById('users-loading');
    const tableBody = document.getElementById('users-table-body');
    loadingRow.style.display = 'table-row'; // Показываем спиннер
    tableBody.innerHTML = ''; // Очищаем таблицу перед загрузкой

    try {
        const response = await axios.get(`${API_URL}/users/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = response.data;

        const message = document.getElementById('create-user-message');
        message.textContent = '';
        message.classList.remove('error');

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.username}</td>
                <td>${user.is_admin ? 'Администратор' : 'Сотрудник'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editUser(${user.id})"><span class="material-icons">edit</span></button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})"><span class="material-icons">delete</span></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        document.getElementById('create-user-message').textContent = 'Ошибка загрузки списка пользователей';
        document.getElementById('create-user-message').classList.add('error');
    } finally {
        loadingRow.style.display = 'none'; // Скрываем спиннер после завершения
    }
}
async function deleteUser(userId) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        try {
            const url = `${API_URL}/users/${userId}`;
            console.log('Sending DELETE request to:', url);
            console.log('Token:', token);
            const response = await axios.delete(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Delete response:', response.status); // Отладка статуса ответа
            showToast('Пользователь удалён', 'success');
            loadUsers();
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error.response?.data || error.message);
            showToast(`Ошибка удаления: ${error.response?.data?.detail || error.message}`, 'error');
        }
    }
}

async function editUser(userId) {
    try {
        const response = await axios.get(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = response.data;

        const modal = document.getElementById('edit-user-modal');
        if (!modal) {
            console.error('Edit user modal not found');
            showToast('Ошибка: модальное окно редактирования не найдено', 'error');
            return;
        }

        const emailInput = document.getElementById('edit-user-email');
        const usernameInput = document.getElementById('edit-user-username');
        const passwordInput = document.getElementById('edit-user-password');
        const isAdminCheckbox = document.getElementById('edit-user-is-admin');
        const currentPasswordInput = document.getElementById('edit-user-current-password');

        if (!emailInput || !usernameInput || !passwordInput || !isAdminCheckbox || !currentPasswordInput) {
            console.error('One or more edit user form elements not found');
            showToast('Ошибка: элементы формы редактирования пользователя не найдены', 'error');
            return;
        }

        emailInput.value = user.email;
        usernameInput.value = user.username;
        isAdminCheckbox.checked = user.is_admin;
        passwordInput.value = '';

        // Проверяем, может ли текущий пользователь менять статус
        const currentUserResponse = await axios.get(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const currentUser = currentUserResponse.data;
        if (!currentUser.is_admin || (user.is_admin && user.created_by_admin !== currentUser.id)) {
            isAdminCheckbox.disabled = true; // Отключаем чекбокс, если нет прав
        } else {
            isAdminCheckbox.disabled = false;
        }

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);

        const closeModal = document.getElementById('edit-user-close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            });
        }

        const editForm = document.getElementById('edit-user-form');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userData = {
                    email: emailInput.value,
                    username: usernameInput.value,
                    password: passwordInput.value || null,
                    is_admin: isAdminCheckbox.checked,
                    current_password: currentPasswordInput.value
                };

                try {
                    const updateResponse = await axios.put(`${API_URL}/users/${userId}`, userData, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    modal.classList.remove('active');
                    setTimeout(() => modal.style.display = 'none', 300);
                    showToast('Пользователь обновлён', 'success');
                    loadUsers();
                } catch (error) {
                    document.getElementById('edit-user-message').textContent = error.response?.data?.detail || 'Ошибка обновления';
                    document.getElementById('edit-user-message').classList.add('error');
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
    }
}