# Kontrakt: zdjęcia fotobudki na ekranie quizu

Jedyna wspólna powierzchnia Imprezja Booth i Imprezja Quiz. Aplikacja fotobudki nie mieszka w tym repozytorium.

Quiz pokazuje zdjęcie slajdem `type: "image"` (`src`, `caption`, `duration`) na `public/prezentacja-screen.html`. Fotobudka nie woła Familiady, licencji, DMX ani reszty quizu.

## Zdarzenia Socket.IO

| Zdarzenie | Kierunek | Znaczenie |
| --- | --- | --- |
| `booth_photos_present` | fotobudka → quiz | pokaż te zdjęcia |
| `booth_photos_shown` | quiz → fotobudka | które zdjęcia weszły na ekran |

```json
{
  "presentation": "fotobudka",
  "mode": "replace",
  "show": true,
  "playing": false,
  "loop": true,
  "transition": "fade",
  "photos": [
    {
      "id": "booth-1",
      "src": "/uploads/prezentacje/fotobudka/1.jpg",
      "caption": "Para młoda",
      "durationSec": 8,
      "takenAt": "2026-09-30T18:00:00.000Z"
    }
  ]
}
```

`src` musi być lokalną ścieżką `/uploads/...` bez `..`. Plik wgrywa się wcześniej istniejącym `POST /api/prezentacje/upload` albo `POST /upload`. `mode: "append"` dokleja slajdy do bieżącej prezentacji. Domyślne `replace` podmienia zestaw na same zdjęcia z budki.

Moduł: `contracts/photo-presentation.js`. Sprawdzenie: `node contracts/photo-presentation.test.js`.
