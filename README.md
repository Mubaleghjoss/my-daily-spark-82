# Aktivitas-Ku

Aplikasi produktivitas all-in-one yang dirancang untuk membantu pengguna mengelola aktivitas harian, keuangan, catatan, serta mengumpulkan doa & nasehat islami dalam satu platform yang modern, ringan, dan mudah digunakan.

Live URL: https://my-daily-spark-82.lovable.app

---

## Ringkasan Aplikasi

**Aktivitas-Ku** adalah Progressive Web App (PWA) yang menggabungkan beberapa fitur produktivitas utama dalam satu antarmuka yang bersih dan responsif. Aplikasi ini cocok digunakan untuk individu yang ingin mengatur rutinitas harian, mencatat arus kas pribadi, menyimpan catatan penting, dan mengakses doa harian beserta terjemahannya.

Aplikasi ini memiliki model freemium:

- **Gratis**: Aktivitas harian, kalender, analitik dasar, keuangan dasar, doa & nasehat pribadi.
- **Premium**: Focus timer (Pomodoro), catatan tak terbatas, budget & export, transaksi berulang, koleksi doa publik, dan fitur eksklusif lainnya.

---

## Fitur Utama

- **Aktivitas Harian**: Kelola rutinitas dan to-do list, buat sub-aktivitas, dan pantau progress harian.
- **Focus Timer**: Teknik Pomodoro untuk meningkatkan fokus dan produktivitas.
- **Keuangan**: Catat pemasukan dan pengeluaran, pantau arus kas, dan kelola budget bulanan.
- **Catatan**: Simpan ide, memo, atau catatan penting dengan aman.
- **Doa & Nasehat**: Koleksi doa harian dan nasehat islami lengkap dengan teks Arab dan terjemahan.
- **Kalender**: Lihat aktivitas dalam tampilan kalender untuk perencanaan mingguan/bulanan.
- **Analitik**: Pantau statistik produktivitas dan tren aktivitas harian.
- **Transaksi Berulang**: Atur transaksi rutin agar tercatat secara otomatis.
- **Doa Publik**: Akses koleksi doa dari komunitas pengguna lain.

---

## Teknologi yang Digunakan

- [Vite](https://vitejs.dev/) — Build tool dan dev server
- [React 18](https://react.dev/) — Library UI
- [TypeScript](https://www.typescriptlang.org/) — Typed JavaScript
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) — Komponen UI yang dapat digunakan kembali
- [Supabase](https://supabase.com/) — Backend, autentikasi, dan database (via Lovable Cloud)
- [React Router](https://reactrouter.com/) — Routing client-side
- [TanStack Query](https://tanstack.com/query/) — Data fetching dan state management
- [Recharts](https://recharts.org/) — Visualisasi data grafik
- [date-fns](https://date-fns.org/) — Manipulasi tanggal
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — Dukungan PWA

---

## Struktur Folder

```text
Aktivitas-ku/
├── public/              # Aset statis dan manifest PWA
├── src/
│   ├── components/      # Komponen UI dan section halaman landing
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Konfigurasi Supabase client (auto-generated)
│   ├── lib/             # Helper utilities
│   ├── pages/           # Halaman aplikasi
│   ├── App.tsx          # Entry routing
│   ├── index.css        # Global styles dan tema
│   └── main.tsx         # Entry point React
├── supabase/            # Konfigurasi dan edge functions Supabase
├── index.html
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## Cara Menjalankan di Lokal

### Prasyarat

- Node.js versi 18 atau lebih baru
- npm (atau package manager alternatif seperti `bun`)

### Langkah-langkah

1. Clone repository

```bash
git clone https://github.com/Mubaleghjoss/Aktivitas-ku.git
cd Aktivitas-ku
```

2. Install dependencies

```bash
npm install
# atau
bun install
```

3. Atur environment variables

Pastikan file `.env` di root project berisi variabel berikut:

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-anon-key>"
VITE_SUPABASE_PROJECT_ID="<project-ref>"
```

> **Catatan**: Jika kamu menggunakan Lovable Cloud, nilai-nilai tersebut sudah tersedia di dalam project. Untuk pengembangan lokal di luar Lovable, sesuaikan dengan kredensial Supabase project-mu sendiri.

4. Jalankan development server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173` (atau port lain jika 5173 sudah digunakan).

5. Build untuk production

```bash
npm run build
```

Hasil build akan tersimpan di folder `dist/`.

---

## Deployment & Publishing

Aplikasi ini dibangun di atas Lovable. Untuk deployment dan publikasi:

1. **Lovable Hosting**: Klik **Share → Publish** di editor Lovable untuk mempublikasikan aplikasi ke URL publik.
2. **GitHub Sync**: Gunakan fitur **GitHub** di Lovable editor untuk menyinkronkan kode project ini ke repository GitHub. Integrasi ini bersifat two-way, sehingga perubahan di Lovable akan otomatis push ke GitHub, dan sebaliknya.

Untuk informasi lebih lanjut, lihat dokumentasi Lovable: https://docs.lovable.dev/

---

## Catatan Backend

Backend aplikasi ini menggunakan Lovable Cloud (Supabase). Database, autentikasi, Row Level Security (RLS), dan edge functions dikelola melalui Lovable. Jika ingin menjalankan project ini di luar Lovable, kamu perlu:

- Membuat project Supabase sendiri.
- Menjalankan migration SQL yang sesuai untuk tabel (`activities`, `activity_completions`, `transactions`, `notes`, `prayers`, `pomodoro_sessions`, dsb.).
- Mengaktifkan RLS dan kebijakan akses yang sesuai.
- Menyesuaikan kredensial Supabase di file `.env`.

---

## Lisensi

Project ini dibuat untuk keperluan pribadi dan pengembangan aplikasi produktivitas. Silakan modifikasi sesuai kebutuhan.
