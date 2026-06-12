# Systemarkitektur — Kontraktstyring

## 1. Overordnet arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Klient (PWA)                                               │
│  Next.js 14 App Router · React Server Components · Tailwind │
│  Service Worker: offline app-shell + web push               │
└──────────────┬──────────────────────────────────────────────┘
               │ @supabase/ssr (cookies-baseret session)
┌──────────────▼──────────────────────────────────────────────┐
│  Supabase (gratis tier)                                     │
│  ├─ Auth        e-mail/adgangskode, session i httpOnly      │
│  ├─ PostgreSQL  tabeller + RLS + views + triggers           │
│  ├─ Storage     bucket "contracts" (private PDF'er)         │
│  └─ Edge Func   check-deadlines (dagligt cron kl. 07)       │
│       ├─ interne notifikationer (insert i notifications)    │
│       ├─ web push (VAPID)                                   │
│       └─ e-mail (Resend, valgfri)                           │
└─────────────────────────────────────────────────────────────┘
```

Sikkerhedsprincip: **al adgangskontrol ligger i databasen (RLS)**. UI'et skjuler knapper for læsebrugere, men selv et håndlavet API-kald kan ikke omgå politikkerne.

## 2. Database-design

```
profiles            1 bruger = 1 række (auto-oprettes via trigger ved signup)
├─ id          uuid PK → auth.users
├─ full_name   text
├─ email       text
└─ role        'admin' | 'reader'   (default 'reader')

locations           7 lokationer, hver med eget CVR
├─ id, name, cvr (8 cifre, unik), address, active

categories          IT, Internet, Telefoni, Hygiejne, Måtteservice, ...
├─ id, name (unik)

contracts           kernen i systemet
├─ id, location_id FK, category_id FK
├─ supplier, title
├─ start_date, binding_months, expiry_date
├─ notice_months                     (opsigelsesvarsel)
├─ termination_deadline              (GENERERET: expiry_date - notice_months)
├─ auto_renews bool, renewal_months
├─ status      'active' | 'terminated' | 'renegotiated' | 'expired'
├─ notes
├─ needs_validation text[]           (felter AI ikke var sikker på)
└─ created_by, created_at, updated_at

contract_documents  originale PDF'er
├─ id, contract_id FK, file_name, storage_path, file_size, uploaded_by, uploaded_at

notifications       interne notifikationer
├─ id, user_id FK, contract_id FK, title, body, read, created_at

push_subscriptions  web push pr. enhed
├─ id, user_id FK, endpoint (unik), p256dh, auth_key

reminder_log        forhindrer dublet-påmindelser
├─ contract_id FK, deadline date, sent_at  (unik på contract_id+deadline)
```

**Statuslogik** (beregnes ud fra `termination_deadline`, kun for aktive kontrakter):

| Farve | Regel |
|---|---|
| 🔴 Rød | Opsigelsesfrist ≤ 30 dage (eller overskredet) |
| 🟡 Gul | Opsigelsesfrist ≤ 60 dage |
| 🟢 Grøn | > 60 dage — ingen handling nødvendig |

Logikken findes ét sted i SQL (`contract_overview` view, kolonnen `urgency`) og ét sted i TypeScript (`src/lib/contracts.ts`) til klient-badges.

## 3. UI/UX-design

Inspiration: Linear (tæthed, tastatur-venlighed), Notion (ro, hierarki), Stripe Dashboard (datakort + tabeller).

- Mørkt, minimalistisk tema; én accentfarve (indigo); status kommunikeres udelukkende med grøn/gul/rød
- Forsiden er **handlingsorienteret**: det vigtigste (kontrakter der kræver handling) står øverst
- Ingen dekorative elementer; al farve betyder noget
- Mobil: sidebar kollapser til bundnavigation-agtig topbar; tabeller bliver kort-lister

## 4. Wireframes

```
LOGIN                          DASHBOARD (desktop)
┌──────────────┐   ┌──────────┬──────────────────────────────────┐
│              │   │ ◆ Logo   │ Dashboard                        │
│   ◆ Logo     │   │          │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  ┌────────┐  │   │ Dashboard│ │ 🔴 3 │ │ 🟡 5 │ │ 42  │ │  7  │ │
│  │ E-mail │  │   │ Handling │ │kræver│ │snart │ │aktive│ │lokat│ │
│  ├────────┤  │   │ Kontrakt.│ └─────┘ └─────┘ └─────┘ └─────┘ │
│  │ Kode   │  │   │ Lokation.│ HANDLING KRÆVES NU               │
│  ├────────┤  │   │ Kategori.│ ┌──────────────────────────────┐ │
│  │ Log ind│  │   │ Notifik. │ │🔴 TDC · Hovedkontor · 12 dage│ │
│  └────────┘  │   │ ──────── │ │🟡 ISS · Aarhus C · 47 dage   │ │
│              │   │ Admin    │ └──────────────────────────────┘ │
└──────────────┘   │ Log ud   │ Pr. lokation │ Pr. kategori      │
                   └──────────┴──────────────────────────────────┘

KONTRAKTLISTE                       KONTRAKTDETALJE
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ [Søg] [Lokation▾][Kategori▾]│  │ ← Tilbage     [Redigér]     │
│       [Status▾]  [+Ny]      │  │ TDC Erhverv  🔴 12 dage     │
│ ┌─────────────────────────┐ │  │ Lokation: Hovedkontor       │
│ │🔴 TDC · Telefoni · Hoved│ │  │ Start: 01.01.2023           │
│ │🟡 ISS · Måtter · Aarhus │ │  │ Udløb: 31.12.2026           │
│ │🟢 Verisure · Alarm · ...│ │  │ Varsel: 6 mdr               │
│ └─────────────────────────┘ │  │ Opsigelsesfrist: 30.06.2026 │
│                             │  │ Auto-forlængelse: Ja (12 mdr)│
└─────────────────────────────┘  │ 📄 kontrakt_tdc.pdf [Hent]  │
                                 └─────────────────────────────┘
```

## 5. Sidehierarki

```
/login                      offentlig
/(app)/                     kræver login (middleware + RLS)
├─ /dashboard               nøgletal + handlingsliste + fordeling
├─ /handling                ⭐ alle kontrakter sorteret efter dage til frist
├─ /kontrakter              tabel med filtre (lokation/kategori/leverandør/status)
│  ├─ /kontrakter/ny        opret (manuelt eller med PDF-upload)  [admin]
│  └─ /kontrakter/[id]      detaljer + dokumenter + redigér [admin]
├─ /lokationer              kort pr. lokation med kontrakt-antal
│  └─ /lokationer/[id]      lokationens kontrakter
├─ /kategorier              administrér kategorier [admin]
├─ /notifikationer          interne notifikationer + aktivér push
└─ /admin                   brugere og roller [admin]
```

## 6. API-struktur

Næsten alt går direkte til Supabase (RLS beskytter). Server actions håndterer mutationer; kun ét egentligt API-endpoint:

```
Server actions (src/app/actions/*)
  contracts.ts   createContract, updateContract, deleteContract, uploadDocument
  locations.ts   createLocation, updateLocation
  categories.ts  createCategory, deleteCategory
  admin.ts       updateUserRole
  notifications.ts markRead, savePushSubscription

Route handlers
  POST /api/extract      AI-kontraktanalyse (501 hvis AI_PROVIDER ikke er sat)

Supabase Edge Function
  check-deadlines        dagligt cron → notifikationer/push/e-mail
```

## 7. AI-analyseflow

```
PDF vælges i formular
   └─ POST /api/extract (multipart)
        ├─ AI_PROVIDER tom?  → 501 → formular forbliver manuel (status i dag)
        └─ ellers: PDF → LLM med struktureret JSON-skema
             { supplier, start_date, binding_months, expiry_date,
               notice_months, auto_renews, renewal_months, notes,
               confidence: { felt: 0-1 } }
             └─ felter med confidence < 0.8 → needs_validation[]
                  → markeres gult i formularen: "⚠ kræver manuel validering"
Brugeren godkender/retter ALTID inden gem — AI udfylder kun formularen.
```

Interfacet `ContractExtractor` i `src/lib/ai/extract.ts` gør det trivielt at skifte udbyder.

## 8. Notifikationsflow

```
Dagligt cron (07:00)
  └─ Edge function check-deadlines
       1. SELECT aktive kontrakter hvor termination_deadline ≤ i dag + 30 dage
       2. Filtrér mod reminder_log (én påmindelse pr. kontrakt pr. frist)
       3. For hver kontrakt:
            a. INSERT notification til alle brugere:
               "Kontrakten med [leverandør] for [lokation] nærmer sig
                opsigelsesfristen ([dato]). Vurder om aftalen skal
                opsiges eller genforhandles."
            b. Web push til alle push_subscriptions (VAPID)
            c. E-mail til alle brugere (Resend, hvis konfigureret)
            d. INSERT i reminder_log
```

Interne notifikationer vises med badge i sidebaren (realtime via Supabase-kanal).

## 9. PWA-opsætning

- `public/manifest.json` — navn, ikoner, standalone display
- `public/sw.js` — network-first navigation cache + push-handler + notification-click
- `src/components/pwa-register.tsx` — registrerer SW ved load
- Push-tilmelding pr. enhed på /notifikationer (gemmes i `push_subscriptions`)
- iOS: kræver "Føj til hjemmeskærm" + iOS 16.4+ for push

## 10. Omkostninger

| Komponent | Plan | Pris |
|---|---|---|
| Supabase (DB, auth, storage 1 GB, edge functions) | Free | 0 kr |
| Vercel hosting | Hobby | 0 kr |
| Web push | VAPID (egen nøgle) | 0 kr |
| Resend e-mail | Free (100/dag) | 0 kr |
| AI-analyse (valgfri, senere) | pay-as-you-go | ~5-15 øre pr. kontrakt |
