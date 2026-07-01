# Текстуры декора фасада

Сюда положите фото декоративных элементов (наличники, пилястры, карнизы).
Имя файла должно совпадать с `id` записи из `lib/decor.ts`:

`/decor/{id}.jpg`

Пример (когда добавите запись в `DECOR`):

| id (в каталоге) | Файл | Категория |
|---|---|---|
| `trim-classic` | `trim-classic.jpg` | obramlenie |
| `pilaster-classic` | `pilaster-classic.jpg` | pilyastra |
| `cornice-classic` | `cornice-classic.jpg` | karniz |

Если файла нет — приложение не падает: показывается цветной `swatch` (fallback),
а Gemini использует текстовое описание `hint`.
