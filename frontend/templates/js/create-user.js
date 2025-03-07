function initializeCreateUserListeners() {
    // Привязываем обработчик к кнопке "Управление пользователями" в сайдбаре
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
            console.log('Клик по #create-user-btn');
            showSection('create-user-section');
            if (token && token !== 'null') {
                console.log('Загружаем пользователей');
                loadUsers();
            } else {
                console.log('Токен отсутствует');
            }
        });
    } else {
        console.error('Кнопка #create-user-btn не найдена в DOM');
    }

    // Проверяем наличие модального окна и кнопки открытия
    const createUserModalBtn = document.getElementById('create-user-modal-btn');
    const createUserModal = document.getElementById('create-user-modal');
    const createUserCloseModal = document.getElementById('create-user-close-modal');

    if (!createUserModalBtn) {
        console.error('Кнопка #create-user-modal-btn не найдена в DOM');
        return;
    }
    if (!createUserModal) {
        console.error('Модальное окно #create-user-modal не найдено в DOM');
        return;
    }
    if (!createUserCloseModal) {
        console.error('Кнопка закрытия #create-user-close-modal не найдена в DOM');
        return;
    }

    // Открытие модального окна
    createUserModalBtn.addEventListener('click', () => {
        createUserModal.style.display = 'flex';
        setTimeout(() => createUserModal.classList.add('active'), 10);
    });

    // Закрытие модального окна
    createUserCloseModal.addEventListener('click', () => {
        createUserModal.classList.remove('active');
        setTimeout(() => createUserModal.style.display = 'none', 300);
    });

    // Обработчик формы создания пользователя
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const visibleFields = Array.from(document.querySelectorAll('#create-client-fields input[type="checkbox"]:checked'))
                .map(input => input.value);

            const userData = {
                email: document.getElementById('create-user-email').value,
                username: document.getElementById('create-user-username').value,
                password: document.getElementById('create-user-password').value,
                department: document.getElementById('create-user-department').value,
                visible_client_fields: visibleFields
            };

            try {
                const response = await axios.post(`${API_URL}/users/`, userData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                document.getElementById('create-user-message').textContent = 'Пользователь создан!';
                document.getElementById('create-user-message').classList.remove('error');
                document.getElementById('create-user-message').classList.add('success');
                createUserForm.reset();
                showToast('Пользователь успешно создан', 'success');
                createUserModal.classList.remove('active');
                setTimeout(() => createUserModal.style.display = 'none', 300);
                loadUsers();
            } catch (error) {
                const errorDetail = error.response?.data?.detail;
                document.getElementById('create-user-message').textContent = Array.isArray(errorDetail)
                    ? errorDetail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                    : errorDetail || 'Ошибка создания пользователя';
                document.getElementById('create-user-message').classList.add('error');
            }
        });
    } else {
        console.error('Форма #create-user-form не найдена в DOM');
    }
}

async function loadUsers() {
    const loadingRow = document.getElementById('users-loading');
    const tableBody = document.getElementById('users-table-body');

    if (!tableBody) {
        console.error('Элемент #users-table-body не найден в DOM');
        return;
    }

    if (loadingRow) {
        loadingRow.style.display = 'table-row';
    }

    tableBody.innerHTML = '';

    try {
        const response = await axios.get(`${API_URL}/users/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = response.data;

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
        showToast('Ошибка загрузки списка пользователей', 'error');
    } finally {
        if (loadingRow) {
            loadingRow.style.display = 'none';
        }
    }
}

// Экспортируем функцию для вызова из scripts.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeCreateUserListeners, loadUsers };
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
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);

        document.getElementById('edit-user-email').value = user.email;
        document.getElementById('edit-user-username').value = user.username;
        document.getElementById('edit-user-department').value = user.department;
        document.getElementById('edit-user-is-admin').checked = user.is_admin;
        document.getElementById('edit-user-password').value = '';

        // Заполняем чекбоксы видимых полей
        const fieldCheckboxes = document.querySelectorAll('#edit-client-fields input[type="checkbox"]');
        fieldCheckboxes.forEach(checkbox => {
            checkbox.checked = user.visible_client_fields?.includes(checkbox.value) || false;
        });

        const currentUserResponse = await axios.get(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const currentUser = currentUserResponse.data;
        if (!currentUser.is_admin || (user.is_admin && user.created_by_admin !== currentUser.id)) {
            document.getElementById('edit-user-is-admin').disabled = true;
        } else {
            document.getElementById('edit-user-is-admin').disabled = false;
        }

        const editForm = document.getElementById('edit-user-form');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const visibleFields = Array.from(document.querySelectorAll('#edit-client-fields input[type="checkbox"]:checked'))
                .map(input => input.value);

            const userData = {
                email: document.getElementById('edit-user-email').value,
                username: document.getElementById('edit-user-username').value,
                password: document.getElementById('edit-user-password').value || null,
                department: document.getElementById('edit-user-department').value,
                is_admin: document.getElementById('edit-user-is-admin').checked,
                visible_client_fields: visibleFields,
                current_password: document.getElementById('edit-user-current-password').value
            };

            try {
                await axios.put(`${API_URL}/users/${userId}`, userData, {
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

        document.getElementById('edit-user-close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        });
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
    }
}