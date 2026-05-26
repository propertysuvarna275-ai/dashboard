# Propel CRM Dashboard

A static frontend plus Vercel serverless API for shared Neon/Postgres storage.

## Fitur yang sudah diimplementasikan
- Backend shared database untuk semua karyawan melalui Neon/Postgres.
- Server-side auth dengan session token.
- Marketing dapat menambah konsumen, tapi tidak dapat mengedit atau menghapus data klien.
- Admin dapat mengelola akun pengguna dan menghapus / memperbarui data
- Riwayat follow-up modern dengan nama pengguna yang membuat catatan.
- Frontend tetap statis menggunakan `crm.js` dan memanggil API.

## Persiapan Neon
1. Buat project di Neon.
2. Buat database Postgres.
3. Salin connection string Postgres ke environment variable `DATABASE_URL`.

## Setup lokal
1. Copy `.env.example` ke `.env`.
2. Set `DATABASE_URL` dengan connection string Neon/Postgres.
3. Jalankan:
   ```sh
   npm install
   ```
4. Jalankan server lokal (jika sudah memasang Vercel CLI):
   ```sh
   vercel dev
   ```

## Deploy ke Vercel
1. Login ke Vercel.
2. Pilih project repository ini.
3. Di dashboard project, buka `Settings > Environment Variables`.
4. Tambahkan environment variable:
   - `DATABASE_URL` = connection string Neon/Postgres
5. Deploy project.
6. Setelah deploy, buka URL Vercel dan masuk melalui halaman `login.html`.

## Neon / Postgres
1. Buat database baru di Neon.
2. Jalankan SQL di `sql/schema.sql` untuk membuat tabel.
3. Pastikan `DATABASE_URL` mengarah ke database Neon Anda.

## Default admin
Setelah schema dijalankan, akun admin default tersedia:
- Email: `admin@propel.local`
- Password: `admin123`

## SQL schema
Gunakan file `sql/schema.sql` untuk membuat tabel pada database Neon.
