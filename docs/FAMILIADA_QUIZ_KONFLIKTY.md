# Familiada vs Quiz – analiza konfliktów

## Podsumowanie: **brak konfliktów**

Tryb Familiady jest odizolowany od Quizu. Oba tryby mogą współistnieć bez wzajemnego wpływu.

---

## Architektura

| Aspekt | Quiz | Familiada |
|--------|------|-----------|
| **Strona ekranu** | `/Screen.html` | `/familiada/screen.html` |
| **Panel admina** | `/admin.html` | `/familiada/admin.html` |
| **Socket room** | `ADMIN_ROOM`, gracze w `players` | `familiada` |
| **Eventy** | `admin_start_question`, `admin_*` | `select_question`, `familiada_*` |
| **Identyfikacja** | `socket.admin` | `socket.familiadaRole` |

---

## gameMode

- `null` / `'quiz'` → broadcast stanu quizu działa (telefony dostają update_state)
- `'familiada'` → `broadcastState()` i `broadcastStateImmediate()` zwracają wcześniej – quiz nie jest broadcastowany

**Przełączanie:**
- Wejście na `/Screen.html` → `set_game_mode('quiz')` → `gameMode = 'quiz'`
- Start Familiady → `familiada_set_mode` → `gameMode = 'familiada'`

---

## Izolacja

1. **select_question** – tylko Familiada (`socket.familiadaRole === 'admin'`). Quiz używa `admin_start_question`.
2. **Broadcast** – gdy `gameMode === 'familiada'`, quiz nie wysyła update_state.
3. **Rooms** – klienci Familiady są w `io.to('familiada')`, quiz w innych roomach.

---

## Wniosek

Familiada nie wpływa na działanie Quizu. Można bezpiecznie budować i wydawać oba tryby.
