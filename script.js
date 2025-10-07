document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let cards = [];
    let decks = [];
    let currentUser = null;
    let activeDeck = 'all';
    let unsubscribeDecks = null;
    let unsubscribeCards = null;
    let currentQuiz = [];
    let currentCardIndex = 0;

    // --- FIREBASE INITIALIZATION & REFS ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let decksRef;
    let cardsRef;

    // --- DOM ELEMENTS ---
    const authContainer = document.getElementById('auth-container');
    const deckListDiv = document.getElementById('deck-list');
    const newDeckInput = document.getElementById('new-deck-input');
    const addDeckBtn = document.getElementById('add-deck-btn');
    const cardsListDiv = document.getElementById('cards-list');
    const cardsListTitle = document.getElementById('cards-list-title');
    const deckSelect = document.getElementById('deck-select');
    const frontInput = document.getElementById('front-input');
    const backInput = document.getElementById('back-input');
    const infoModal = new bootstrap.Modal(document.getElementById('info-modal'));
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editCardId = document.getElementById('edit-card-id');
    const editDeckSelect = document.getElementById('edit-deck-select');
    const editFrontInput = document.getElementById('edit-front-input');
    const editBackInput = document.getElementById('edit-back-input');
    const quizSetupDiv = document.getElementById('quiz-setup');
    const quizViewDiv = document.getElementById('quiz-view');
    const quizCard = quizViewDiv.querySelector('.quiz-card');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const endQuizBtn = document.getElementById('end-quiz-btn');
    const quizDeckFilter = document.getElementById('quiz-deck-filter');
    const quizDirectionSelect = document.getElementById('quiz-direction');
    const quizProgress = document.getElementById('quiz-progress');
    const quizFront = document.getElementById('quiz-front');
    const quizIpa = document.getElementById('quiz-ipa');
    const quizBack = document.getElementById('quiz-back');
    const ttsUSBtn = document.getElementById('tts-us-btn');
    const ttsUKBtn = document.getElementById('tts-uk-btn');
    const statusButtonsDiv = document.getElementById('status-buttons');

    // --- AUTH FUNCTIONS ---
    const signOut = () => {
        auth.signOut().catch(error => console.error("Lỗi đăng xuất:", error));
    };

    // --- AUTH STATE OBSERVER ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            decksRef = db.collection('users').doc(user.uid).collection('decks');
            cardsRef = db.collection('users').doc(user.uid).collection('cards');
            authContainer.innerHTML = `<div id="user-info"><img src="${user.photoURL}" alt="${user.displayName}" class="profile-pic"><span>Chào, ${user.displayName.split(' ')[0]}</span><button id="logout-btn" class="btn btn-sm btn-outline-secondary">Đăng xuất</button></div>`;
            authContainer.querySelector('#logout-btn').addEventListener('click', signOut);
            document.body.classList.remove('logged-out');
            loadDataFromFirestore();
        } else {
            currentUser = null;
            window.location.href = 'login.html';
        }
    });

    // --- FIRESTORE DATA FUNCTIONS ---
    const loadDataFromFirestore = () => {
        if (unsubscribeDecks) unsubscribeDecks();
        if (unsubscribeCards) unsubscribeCards();

        unsubscribeDecks = decksRef.orderBy('name').onSnapshot(snapshot => {
            decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUI();
        }, error => console.error("Lỗi khi tải decks:", error));

        unsubscribeCards = cardsRef.onSnapshot(snapshot => {
            cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUI();
        }, error => console.error("Lỗi khi tải cards:", error));
    };

    const clearUI = () => {
        if (unsubscribeDecks) unsubscribeDecks();
        if (unsubscribeCards) unsubscribeCards();
        decks = [];
        cards = [];
        activeDeck = 'all';
        renderUI();
    };

    // --- API & SPEAK FUNCTIONS ---
    const speak = (text, lang) => {
        if (!text || typeof window.speechSynthesis === 'undefined') return alert("Trình duyệt của bạn không hỗ trợ chức năng này.");
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

        // --- API & SPEAK FUNCTIONS ---
    const fetchWordDefinition = async (word) => {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!response.ok) {
                console.error('Không tìm thấy từ này trong từ điển.');
                return null;
            }
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('Lỗi API:', error);
            alert('Có lỗi xảy ra khi kết nối tới API từ điển.');
            return null;
        }
    };
    
    // --- UI RENDERING ---
    const renderUI = () => {
        renderDecks();
        displayCardsByDeck(activeDeck);
        populateDeckDropdowns();
    };

    const renderDecks = () => {
        deckListDiv.innerHTML = `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === 'all' ? 'active' : ''}" data-deck="all"><div class="card-body"><h5 class="card-title">Tất cả thẻ</h5><p class="card-text text-muted">${cards.length} thẻ</p></div></div></div>`;
        decks.forEach(deck => {
            const cardCount = cards.filter(c => c.deck === deck.name).length;
            deckListDiv.innerHTML += `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === deck.name ? 'active' : ''}" data-deck="${deck.name}"><button class="btn delete-deck-btn" data-id="${deck.id}" data-deck-name="${deck.name}"><i class="bi bi-x-circle"></i></button><div class="card-body"><h5 class="card-title">${deck.name}</h5><p class="card-text text-muted">${cardCount} thẻ</p></div></div></div>`;
        });
    };

    const displayCardsByDeck = (deckName) => {
        activeDeck = deckName;
        cardsListTitle.innerText = deckName === 'all' ? 'Tất cả thẻ' : `Thẻ trong bộ: ${deckName}`;
        const filteredCards = deckName === 'all' ? cards : cards.filter(card => card.deck === deckName);
        cardsListDiv.innerHTML = '';
        if (filteredCards.length === 0) {
            cardsListDiv.innerHTML = '<p class="text-center text-muted mt-3">Không có thẻ nào.</p>';
            return;
        }
        filteredCards.forEach(card => {
            cardsListDiv.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><span>${card.front}</span><div class="card-item-actions"><button class="btn btn-sm btn-outline-info info-btn" data-word="${card.front}"><i class="bi bi-info-circle"></i></button><button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${card.id}"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${card.id}"><i class="bi bi-trash"></i></button></div></div>`;
        });
    };

    const populateDeckDropdowns = () => {
        const deckNames = decks.map(d => d.name);
        if (deckNames.length === 0) deckNames.push('Mặc định');
        deckSelect.innerHTML = '';
        editDeckSelect.innerHTML = '';
        quizDeckFilter.innerHTML = '<option value="all">Tất cả bộ thẻ</option>';
        deckNames.forEach(name => {
            const option = `<option value="${name}">${name}</option>`;
            deckSelect.innerHTML += option;
            editDeckSelect.innerHTML += option;
            quizDeckFilter.innerHTML += option;
        });
    };

    // --- EVENT LISTENERS (CRUD) ---
    addDeckBtn.addEventListener('click', () => {
        const newDeckName = newDeckInput.value.trim();
        if (newDeckName && !decks.some(d => d.name === newDeckName)) {
            decksRef.add({ name: newDeckName, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
                .then(() => newDeckInput.value = '')
                .catch(error => console.error("Lỗi khi thêm bộ thẻ:", error));
        } else alert('Tên bộ thẻ không hợp lệ hoặc đã tồn tại!');
    });

    deckListDiv.addEventListener('click', (e) => {
        const deckCard = e.target.closest('.deck-card');
        const deleteBtn = e.target.closest('.delete-deck-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const deckIdToDelete = deleteBtn.dataset.id;
            const deckNameToDelete = deleteBtn.dataset.deckName;
            if (confirm(`Bạn có chắc muốn xóa bộ thẻ "${deckNameToDelete}"? (Các thẻ bên trong sẽ không bị xóa)`)) {
                decksRef.doc(deckIdToDelete).delete().catch(error => console.error("Lỗi xóa bộ thẻ:", error));
            }
        } else if (deckCard) {
            document.querySelectorAll('.deck-card').forEach(c => c.classList.remove('active'));
            deckCard.classList.add('active');
            displayCardsByDeck(deckCard.dataset.deck);
        }
    });

    // Nút Lưu Thẻ không có trong file HTML, nhưng logic vẫn giữ lại phòng khi cần
    const saveCardButton = document.getElementById('save-card-btn');
    if (saveCardButton) {
        saveCardButton.addEventListener('click', () => {
            if (!deckSelect.value) return alert("Vui lòng tạo một bộ thẻ trước!");
            const card = {
                front: document.getElementById('front-input').value.trim(),
                back: document.getElementById('back-input').value.trim(),
                deck: deckSelect.value,
                status: 'chua-thuoc',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (card.front && card.back) {
                cardsRef.add(card).then(() => {
                    activeDeck = card.deck;
                    document.getElementById('library-tab').click();
                    document.getElementById('front-input').value = '';
                    document.getElementById('back-input').value = '';
                }).catch(error => console.error("Lỗi thêm thẻ:", error));
            } else alert('Vui lòng điền đầy đủ thông tin!');
        });
    }

    cardsListDiv.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const cardId = target.dataset.id;

        if (target.classList.contains('info-btn')) {
            const word = target.dataset.word;
            infoModalTitle.textContent = word;
            infoModalBody.innerHTML = '<p class="text-center">Đang tải...</p>';
            infoModal.show();
            const data = await fetchWordDefinition(word);
            if (data) {
                let html = `<p><strong>Phiên âm:</strong> ${data.phonetic || (data.phonetics.find(p => p.text)?.text || 'N/A')} <span class="badge bg-secondary" onclick="speak('${word}', 'en-US')">🔊 US</span> <span class="badge bg-secondary" onclick="speak('${word}', 'en-GB')">🔊 UK</span></p>`;
                data.meanings.forEach(meaning => {
                    html += `<h6><em>${meaning.partOfSpeech}</em></h6>`;
                    meaning.definitions.forEach((def, index) => {
                        html += `<p><b>${index + 1}.</b> ${def.definition}</p>${def.example ? `<p class="text-muted fst-italic">"${def.example}"</p>` : ''}`;
                    });
                    if (meaning.synonyms?.length > 0) html += `<p><strong>Từ đồng nghĩa:</strong> ${meaning.synonyms.join(', ')}</p>`;
                    if (meaning.antonyms?.length > 0) html += `<p><strong>Từ trái nghĩa:</strong> ${meaning.antonyms.join(', ')}</p>`;
                });
                infoModalBody.innerHTML = html;
            } else {
                infoModalBody.innerHTML = '<p class="text-center text-danger">Không thể tải thông tin cho từ này.</p>';
            }
        } else if (target.classList.contains('edit-btn')) {
            const cardToEdit = cards.find(c => c.id === cardId);
            if (cardToEdit) {
                editCardId.value = cardToEdit.id;
                editDeckSelect.value = cardToEdit.deck;
                editFrontInput.value = cardToEdit.front;
                editBackInput.value = cardToEdit.back;
                editModal.show();
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Bạn có chắc muốn xóa thẻ này?')) {
                cardsRef.doc(cardId).delete().catch(error => console.error("Lỗi xóa thẻ:", error));
            }
        }
    });

    saveEditBtn.addEventListener('click', () => {
        const id = editCardId.value;
        const updatedData = {
            deck: editDeckSelect.value,
            front: editFrontInput.value.trim(),
            back: editBackInput.value.trim(),
        };
        cardsRef.doc(id).update(updatedData)
            .then(() => editModal.hide())
            .catch(error => console.error("Lỗi cập nhật thẻ:", error));
    });

    // --- QUIZ LOGIC ---
    const startQuiz = () => {
        const selectedDeck = quizDeckFilter.value;
        const selectedStatuses = [...document.querySelectorAll('.status-filter:checked')].map(el => el.value);
        if (selectedStatuses.length === 0) return alert('Bạn phải chọn ít nhất một trạng thái để ôn tập!');

        let filteredCards = cards;
        if (selectedDeck !== 'all') {
            filteredCards = cards.filter(card => card.deck === selectedDeck);
        }

        currentQuiz = filteredCards.filter(card => selectedStatuses.includes(card.status));
        currentQuiz.sort(() => Math.random() - 0.5);

        if (currentQuiz.length === 0) return alert('Không có thẻ nào phù hợp với lựa chọn của bạn.');

        currentCardIndex = 0;
        quizSetupDiv.classList.add('hidden');
        quizViewDiv.classList.remove('hidden');
        showNextCard();
    };

    const endQuiz = () => {
        quizSetupDiv.classList.remove('hidden');
        quizViewDiv.classList.add('hidden');
    };

    const showNextCard = () => {
        quizCard.classList.remove('is-flipped');
        setTimeout(() => {
            const card = currentQuiz[currentCardIndex];
            const direction = quizDirectionSelect.value;
            // Dòng kiểm tra lỗi đã được xóa bỏ
            if (direction === 'front-to-back') {
                quizFront.textContent = card.front;
                quizBack.textContent = card.back;
            } else {
                quizFront.textContent = card.back;
                quizBack.textContent = card.front;
            }
            quizIpa.textContent = card.ipa || '';
            quizProgress.textContent = `Thẻ ${currentCardIndex + 1} / ${currentQuiz.length}`;
            statusButtonsDiv.classList.add('hidden');
        }, 300);
    };

    const flipCardAction = () => {
        if (quizViewDiv.classList.contains('hidden')) return;
        quizCard.classList.toggle('is-flipped');
        statusButtonsDiv.classList.toggle('hidden');
    }

    statusButtonsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-btn')) {
            const newStatus = e.target.dataset.status;
            const currentCardInQuiz = currentQuiz[currentCardIndex];
            cardsRef.doc(currentCardInQuiz.id).update({ status: newStatus })
                .catch(error => console.error("Lỗi cập nhật trạng thái thẻ:", error));

            currentCardIndex++;
            if (currentCardIndex < currentQuiz.length) {
                showNextCard();
            } else {
                alert('Bạn đã hoàn thành phiên ôn tập!');
                endQuiz();
            }
        }
    });

    startQuizBtn.addEventListener('click', startQuiz);
    endQuizBtn.addEventListener('click', endQuiz);
    quizCard.addEventListener('click', flipCardAction);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !quizViewDiv.classList.contains('hidden')) {
            e.preventDefault();
            flipCardAction();
        }
    });
    ttsUSBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-US') });
    ttsUKBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-GB') });

    // --- INITIALIZATION ---
    window.speak = speak;
});