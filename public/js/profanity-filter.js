/**
 * Filtr niecenzuralnych słów - działa offline
 * Baza polskich i angielskich słów niecenzuralnych
 */
(function() {
    'use strict';

    // Baza słów niecenzuralnych (polskie + angielskie)
    const PROFANITY_WORDS = [
        // Polskie (częste)
        'kurwa', 'chuj', 'huj', 'dupa', 'pierdol', 'jebac', 'jebać', 'jebany', 'jebana', 'jebane',
        'pierdolony', 'pierdolona', 'pierdolone', 'pierdol', 'pierdole', 'pierdolić',
        'chujowy', 'chujowa', 'chujowe', 'chujem', 'chuja', 'chuje',
        'dupek', 'dupa', 'dupy', 'dupe', 'dupie',
        'suka', 'suki', 'sukę', 'suką',
        'dziwka', 'dziwki', 'dziwkę', 'dziwką',
        'szmata', 'szmaty', 'szmatę', 'szmatą',
        'debil', 'debilu', 'debilu', 'debilu',
        'idiota', 'idioto', 'idioty', 'idiotą',
        'głupi', 'głupia', 'głupie', 'głupim', 'głupią',
        'dupa', 'dupy', 'dupe', 'dupie',
        'kutas', 'kutasa', 'kutasem', 'kutasie',
        'cipa', 'cipę', 'cipą', 'cipie',
        'pizda', 'pizdę', 'pizdą', 'pizdzie',
        'sperma', 'spermę', 'spermą', 'spermie',
        'masturbacja', 'masturbować', 'masturbuje',
        'seks', 'seksu', 'seksem', 'seksie',
        'pornografia', 'porno', 'pornograficzny',
        'gwałt', 'gwałcić', 'gwałci', 'gwałcił',
        'pedal', 'pedały', 'pedała', 'pedałem',
        'gej', 'geje', 'geja', 'gejem',
        'lesbijka', 'lesbijki', 'lesbijki', 'lesbijki',
        'trans', 'transseksualny',
        'nazi', 'nazista', 'nazistowski',
        'hitler', 'hitlera', 'hitlerem',
        'holocaust', 'holokaust',
        // Angielskie (częste)
        'fuck', 'fucking', 'fucked', 'fucker', 'fuckers',
        'shit', 'shitting', 'shitted', 'shitter',
        'ass', 'asses', 'asshole', 'assholes',
        'bitch', 'bitches', 'bitching', 'bitched',
        'bastard', 'bastards',
        'damn', 'damned', 'damning',
        'hell', 'hells',
        'crap', 'craps', 'crapping', 'crapped',
        'piss', 'pissing', 'pissed', 'pisser',
        'pissed', 'pissing',
        'dick', 'dicks', 'dickhead', 'dickheads',
        'cock', 'cocks', 'cockhead', 'cockheads',
        'pussy', 'pussies',
        'cunt', 'cunts',
        'whore', 'whores', 'whoring', 'whored',
        'slut', 'sluts', 'slutty', 'slutting',
        'nigger', 'niggers', 'nigga', 'niggas',
        'retard', 'retards', 'retarded', 'retarding',
        'gay', 'gays', 'gayer', 'gayest',
        'lesbian', 'lesbians',
        'trans', 'transgender',
        'nazi', 'nazis', 'nazism',
        'hitler', 'hitlers',
        'holocaust', 'holocausts',
        // Dodatkowe warianty
        'k0rwa', 'k0rwy', 'k0rwą', 'k0rwę',
        'chuj', 'chuja', 'chuje', 'chujem',
        'f*ck', 'f**k', 'f***', 'sh*t', 's**t',
        'a$$', 'a$$hole', 'b*tch', 'b**ch',
        // Wulgaryzmy z cyframi
        'k0rwa', 'k0rwy', 'ch0j', 'ch0ja',
        'f0ck', 'f0cking', 'sh1t', 'sh1tting',
        'a55', 'a55hole', 'b1tch', 'b1tches',
        // Skróty i warianty
        'wtf', 'omg', 'lol', 'rofl',
        'kys', 'kill yourself',
        'stfu', 'shut the fuck up',
        'gtfo', 'get the fuck out'
    ];

    /**
     * Normalizuje tekst: usuwa znaki specjalne, zamienia na małe litery, usuwa polskie znaki diakrytyczne
     */
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Usuń znaki diakrytyczne
            .replace(/[^a-z0-9]/g, '') // Zostaw tylko litery i cyfry
            .replace(/[0-9]/g, (m) => {
                // Zamień cyfry na podobne litery (częsty sposób omijania filtrów)
                const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a' };
                return map[m] || m;
            });
    }

    /**
     * Sprawdza czy tekst zawiera niecenzuralne słowa
     * @param {string} text - Tekst do sprawdzenia
     * @returns {boolean} - true jeśli zawiera niecenzuralne słowa
     */
    function containsProfanity(text) {
        if (!text || typeof text !== 'string') return false;
        
        const normalized = normalizeText(text);
        const words = normalized.split(/\s+/).filter(w => w.length > 2); // Słowa dłuższe niż 2 znaki
        
        // Sprawdź każde słowo z bazy
        for (const profanity of PROFANITY_WORDS) {
            const normalizedProfanity = normalizeText(profanity);
            
            // Sprawdź dokładne dopasowanie słowa
            if (words.includes(normalizedProfanity)) {
                return true;
            }
            
            // Sprawdź czy niecenzuralne słowo jest częścią większego słowa (ale tylko jeśli ma min 4 znaki)
            if (normalizedProfanity.length >= 4 && normalized.includes(normalizedProfanity)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Znajduje i usuwa niecenzuralne słowa z tekstu
     * @param {string} text - Tekst do przefiltrowania
     * @returns {string} - Tekst bez niecenzuralnych słów
     */
    function removeProfanityWords(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Podziel tekst na słowa zachowując separatory (spacje, znaki interpunkcyjne)
        const parts = text.split(/(\s+|[^\w\s]+)/);
        const filteredParts = parts.map(part => {
            const trimmed = part.trim();
            
            // Jeśli część jest pusta lub to separator (spacja/znak interpunkcyjny), zachowaj ją
            if (!trimmed || /^\s+$/.test(part) || /^[^\w\s]+$/.test(part)) {
                return part;
            }
            
            // Sprawdź czy część zawiera niecenzuralne słowa
            if (containsProfanity(trimmed)) {
                return ''; // Usuń niecenzuralne słowo
            }
            
            return part;
        });
        
        // Połącz części i usuń podwójne spacje
        const result = filteredParts.join('').replace(/\s+/g, ' ').trim();
        return result;
    }

    /**
     * Zastępuje niecenzuralne słowa gwiazdkami
     * @param {string} text - Tekst do ocenzurowania
     * @returns {string} - Tekst z zastąpionymi niecenzuralnymi słowami
     */
    function censorText(text) {
        if (!text || typeof text !== 'string') return text;
        
        const words = text.split(/(\s+)/);
        const censored = words.map(word => {
            const trimmed = word.trim();
            if (!trimmed) return word; // Zachowaj spacje
            
            if (containsProfanity(trimmed)) {
                // Zastąp gwiazdkami (zachowaj pierwszą i ostatnią literę jeśli możliwe)
                if (trimmed.length <= 2) {
                    return '*'.repeat(trimmed.length);
                }
                return trimmed[0] + '*'.repeat(Math.max(1, trimmed.length - 2)) + trimmed[trimmed.length - 1];
            }
            return word;
        });
        
        return censored.join('');
    }

    /**
     * Filtruje tekst w czasie rzeczywistym podczas wpisywania
     * @param {HTMLInputElement} input - Pole input
     * @param {Function} onBlock - Funkcja wywoływana gdy wykryto niecenzuralne słowo (opcjonalnie)
     * @param {HTMLElement} messageElement - Element do wyświetlania komunikatu (opcjonalnie)
     * @param {string} messageText - Tekst komunikatu (opcjonalnie)
     */
    function setupProfanityFilter(input, onBlock, messageElement, messageText) {
        if (!input) return;
        
        let lastValue = input.value;
        
        function showMessage() {
            if (messageElement && messageText) {
                messageElement.textContent = messageText;
                messageElement.style.display = 'block';
                messageElement.style.opacity = '1';
                
                // Ukryj komunikat po 3 sekundach
                setTimeout(() => {
                    if (messageElement) {
                        messageElement.style.opacity = '0';
                        setTimeout(() => {
                            if (messageElement) {
                                messageElement.style.display = 'none';
                            }
                        }, 300);
                    }
                }, 3000);
            }
            
            if (onBlock) {
                onBlock();
            } else {
                // Domyślnie: krótkie wibracje (jeśli dostępne)
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            }
        }
        
        input.addEventListener('input', (e) => {
            const currentValue = e.target.value;
            
            // Sprawdź cały tekst po każdej zmianie
            if (containsProfanity(currentValue)) {
                // Usuń niecenzuralne słowa z tekstu
                const cleanedValue = removeProfanityWords(currentValue);
                e.target.value = cleanedValue;
                
                // Pokaż komunikat
                showMessage();
                
                // Zaktualizuj lastValue do wyczyszczonej wartości
                lastValue = cleanedValue;
                return;
            }
            
            // Jeśli tekst jest OK, zaktualizuj lastValue
            lastValue = currentValue;
            
            // Ukryj komunikat jeśli był widoczny
            if (messageElement) {
                messageElement.style.display = 'none';
            }
        });
        
        // Sprawdź przy wklejeniu (Ctrl+V / Cmd+V)
        input.addEventListener('paste', (e) => {
            setTimeout(() => {
                const pastedValue = e.target.value;
                if (containsProfanity(pastedValue)) {
                    const cleanedValue = removeProfanityWords(pastedValue);
                    e.target.value = cleanedValue;
                    showMessage();
                }
                lastValue = e.target.value;
            }, 10);
        });
    }

    // Eksportuj funkcje globalnie
    window.ProfanityFilter = {
        containsProfanity: containsProfanity,
        censorText: censorText,
        removeProfanityWords: removeProfanityWords,
        setupProfanityFilter: setupProfanityFilter
    };
})();
