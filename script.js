document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let cards = [];
    let decks = [];
    let currentQuiz = [];
    let currentCardIndex = 0;
    let activeDeck = 'all';

    // --- DOM ELEMENTS ---
    const deckListDiv = document.getElementById('deck-list');
    const newDeckInput = document.getElementById('new-deck-input');
    const addDeckBtn = document.getElementById('add-deck-btn');
    const cardsListDiv = document.getElementById('cards-list');
    const cardsListTitle = document.getElementById('cards-list-title');
    const deckSelect = document.getElementById('deck-select');

    // Add Card Form
    const frontInput = document.getElementById('front-input');
    const backInput = document.getElementById('back-input');
    const ipaInput = document.getElementById('ipa-input');
    const fetchInfoBtn = document.getElementById('fetch-info-btn');
    const saveCardBtn = document.getElementById('save-card-btn');

    // Modals
    const infoModal = new bootstrap.Modal(document.getElementById('info-modal'));
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editCardId = document.getElementById('edit-card-id');
    const editDeckSelect = document.getElementById('edit-deck-select');
    const editFrontInput = document.getElementById('edit-front-input');
    const editIpaInput = document.getElementById('edit-ipa-input');
    const editBackInput = document.getElementById('edit-back-input');

    // Quiz Elements
    const quizSetupDiv = document.getElementById('quiz-setup');
    const quizViewDiv = document.getElementById('quiz-view');
    const quizCard = quizViewDiv.querySelector('.quiz-card'); // ** MỚI **
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

    // --- DATA & API FUNCTIONS ---
    const saveData = () => {
        localStorage.setItem('flashcards', JSON.stringify(cards));
        localStorage.setItem('flashcardDecks', JSON.stringify(decks));
    };

    const loadData = () => {
        const storedCards = localStorage.getItem('flashcards');
        const storedDecks = localStorage.getItem('flashcardDecks');
        cards = storedCards ? JSON.parse(storedCards) : [];
        decks = storedDecks ? JSON.parse(storedDecks) : ['Mặc định'];
        renderUI();
    };

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

    // --- UI RENDERING FUNCTIONS ---
    const renderUI = () => {
        renderDecks();
        displayCardsByDeck(activeDeck);
        populateDeckDropdowns();
    };

    const renderDecks = () => {
        deckListDiv.innerHTML = `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === 'all' ? 'active' : ''}" data-deck="all"><div class="card-body"><h5 class="card-title">Tất cả thẻ</h5><p class="card-text text-muted">${cards.length} thẻ</p></div></div></div>`;
        decks.forEach(deck => {
            const cardCount = cards.filter(c => c.deck === deck).length;
            deckListDiv.innerHTML += `<div class="col-md-4 col-sm-6"><div class="card deck-card text-center h-100 ${activeDeck === deck ? 'active' : ''}" data-deck="${deck}"><button class="btn delete-deck-btn" data-deck-name="${deck}"><i class="bi bi-x-circle"></i></button><div class="card-body"><h5 class="card-title">${deck}</h5><p class="card-text text-muted">${cardCount} thẻ</p></div></div></div>`;
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
        deckSelect.innerHTML = '';
        editDeckSelect.innerHTML = '';
        quizDeckFilter.innerHTML = '<option value="all">Tất cả bộ thẻ</option>';
        if (decks.length === 0) decks.push('Mặc định');
        decks.forEach(deck => {
            const option = `<option value="${deck}">${deck}</option>`;
            deckSelect.innerHTML += option;
            editDeckSelect.innerHTML += option;
            quizDeckFilter.innerHTML += option;
        });
    };

    const speak = (text, lang) => {
        if (!text || typeof window.speechSynthesis === 'undefined') {
            alert("Trình duyệt của bạn không hỗ trợ chức năng này.");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    // --- EVENT LISTENERS ---
    addDeckBtn.addEventListener('click', () => {
        const newDeckName = newDeckInput.value.trim();
        if (newDeckName && !decks.includes(newDeckName)) {
            decks.push(newDeckName);
            saveData();
            renderUI();
            newDeckInput.value = '';
        } else alert('Tên bộ thẻ không hợp lệ hoặc đã tồn tại!');
    });

    deckListDiv.addEventListener('click', (e) => {
        const deckCard = e.target.closest('.deck-card');
        const deleteBtn = e.target.closest('.delete-deck-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const deckNameToDelete = deleteBtn.dataset.deckName;
            if (confirm(`Bạn có chắc muốn xóa bộ thẻ "${deckNameToDelete}"? Tất cả thẻ bên trong cũng sẽ bị xóa vĩnh viễn.`)) {
                decks = decks.filter(d => d !== deckNameToDelete);
                cards = cards.filter(c => c.deck !== deckNameToDelete);
                activeDeck = 'all';
                saveData();
                renderUI();
            }
        } else if (deckCard) {
            document.querySelectorAll('.deck-card').forEach(c => c.classList.remove('active'));
            deckCard.classList.add('active');
            displayCardsByDeck(deckCard.dataset.deck);
        }
    });

    fetchInfoBtn.addEventListener('click', async () => {
        const word = frontInput.value.trim();
        if (!word) return;
        const data = await fetchWordDefinition(word);
        if (data) {
            ipaInput.value = data.phonetic || (data.phonetics.find(p => p.text)?.text || '');
            const firstMeaning = data.meanings[0]?.definitions[0]?.definition || 'Không có định nghĩa.';
            backInput.value = `(Eng) ${firstMeaning}\n\n(Vie) `;
        } else {
            alert('Không tìm thấy thông tin cho từ này.');
        }
    });

    saveCardBtn.addEventListener('click', () => {
        const card = {
            id: Date.now(),
            front: frontInput.value.trim(),
            back: backInput.value.trim(),
            ipa: ipaInput.value.trim(),
            deck: deckSelect.value,
            status: 'chua-thuoc'
        };
        if (card.front && card.back) {
            cards.push(card);
            saveData();
            activeDeck = card.deck;
            renderUI();
            document.getElementById('library-tab').click();
            frontInput.value = backInput.value = ipaInput.value = '';
        } else alert('Vui lòng điền đầy đủ thông tin!');
    });

    cardsListDiv.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
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
            const cardId = target.dataset.id;
            const cardToEdit = cards.find(c => c.id == cardId);
            if (cardToEdit) {
                editCardId.value = cardToEdit.id;
                editDeckSelect.value = cardToEdit.deck;
                editFrontInput.value = cardToEdit.front;
                editIpaInput.value = cardToEdit.ipa;
                editBackInput.value = cardToEdit.back;
                editModal.show();
            }
        } else if (target.classList.contains('delete-btn')) {
            const cardId = target.dataset.id;
            if (confirm('Bạn có chắc muốn xóa thẻ này?')) {
                cards = cards.filter(c => c.id != cardId);
                saveData();
                renderUI();
            }
        }
    });

    saveEditBtn.addEventListener('click', () => {
        const id = editCardId.value;
        const cardIndex = cards.findIndex(c => c.id == id);
        if (cardIndex > -1) {
            cards[cardIndex] = { ...cards[cardIndex], deck: editDeckSelect.value, front: editFrontInput.value.trim(), ipa: editIpaInput.value.trim(), back: editBackInput.value.trim(), };
            saveData();
            renderUI();
            editModal.hide();
        }
    });

    // --- QUIZ LOGIC (ĐÃ CẬP NHẬT) ---
    const startQuiz = () => {
        const selectedDeck = quizDeckFilter.value;
        const selectedStatuses = [...document.querySelectorAll('.status-filter:checked')].map(el => el.value);
        if (selectedStatuses.length === 0) {
            alert('Bạn phải chọn ít nhất một trạng thái để ôn tập!');
            return;
        }
        let filteredCards = cards;
        if (selectedDeck !== 'all') {
            filteredCards = cards.filter(card => card.deck === selectedDeck);
        }
        currentQuiz = filteredCards.filter(card => selectedStatuses.includes(card.status));
        currentQuiz.sort(() => Math.random() - 0.5);
        if (currentQuiz.length === 0) {
            alert('Không có thẻ nào phù hợp với lựa chọn của bạn.');
            return;
        }
        currentCardIndex = 0;
        quizSetupDiv.classList.add('hidden');
        quizViewDiv.classList.remove('hidden');
        showNextCard();
    };

    const endQuiz = () => {
        quizSetupDiv.classList.remove('hidden');
        quizViewDiv.classList.add('hidden');
        renderUI();
    };

    const showNextCard = () => {
        // Reset trạng thái lật thẻ của thẻ cũ
        quizCard.classList.remove('is-flipped');
        
        // Chờ một chút để hiệu ứng reset hoàn tất rồi mới hiển thị thẻ mới
        setTimeout(() => {
            const card = currentQuiz[currentCardIndex];
            const direction = quizDirectionSelect.value;
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
        }, 300); // 300ms, bằng một nửa thời gian transition
    };

    // ** MỚI: Hàm để lật thẻ **
    const flipCardAction = () => {
        if (quizViewDiv.classList.contains('hidden')) return; // Chỉ hoạt động khi đang quiz
        quizCard.classList.toggle('is-flipped');
        statusButtonsDiv.classList.toggle('hidden');
    }

    // ** MỚI: Lật thẻ khi click vào thẻ **
    quizCard.addEventListener('click', flipCardAction);

    // ** MỚI: Lật thẻ bằng phím Space **
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !quizViewDiv.classList.contains('hidden')) {
            e.preventDefault(); // Ngăn trang cuộn xuống
            flipCardAction();
        }
    });

    statusButtonsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-btn')) {
            const newStatus = e.target.dataset.status;
            const currentCardInQuiz = currentQuiz[currentCardIndex];
            const originalCard = cards.find(card => card.id === currentCardInQuiz.id);
            if (originalCard) {
                originalCard.status = newStatus;
                saveData();
            }
            currentCardIndex++;
            if (currentCardIndex < currentQuiz.length) {
                showNextCard();
            } else {
                alert('Bạn đã hoàn thành phiên ôn tập!');
                endQuiz();
            }
        }
    });

    ttsUSBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-US') });
    ttsUKBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(quizFront.textContent, 'en-GB') });
    startQuizBtn.addEventListener('click', startQuiz);
    endQuizBtn.addEventListener('click', endQuiz);

    // --- INITIALIZATION ---
    window.speak = speak;
    loadData();
});