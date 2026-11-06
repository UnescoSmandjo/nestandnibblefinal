# Deploy Nest & Nibble live (Cloudflare Worker + D1)

Database D1 `nest-nibble-db` sudah dibuat dan tabelnya sudah terpasang (schema.sql).

1. Buka terminal di folder `cloudflare/`
2. `npx wrangler login`
3. `npx wrangler secret put API_TOKEN`  (isi token rahasia buatan Anda, misal 24+ karakter acak)
4. `npx wrangler deploy`
5. Buka alamat yang muncul (https://nest-nibble.<akun>.workers.dev), masuk sebagai owner,
   Setelan > Database Cloudflare: isi Token, Simpan & hubungkan.
6. Tekan "Kirim semua data di perangkat ini ke Cloudflare" (sekali, untuk memindahkan data lama).
7. Di HP pegawai: buka "Salin link setup untuk HP pegawai" lalu kirim linknya.
