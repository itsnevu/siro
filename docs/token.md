---
status: PLANNED
last_reviewed: 2026-11-13
source_of_truth: contracts/src/AgentTokenFactory.sol, contracts/src/BuybackBurn.sol, contracts/src/FeeSplitter.sol
---

# Token

## Kondisi per 2026-11-13

- **Tidak ada kontrak token SIRO di repo ini.** Halaman `/token` di situs menyebut staking,
  diskon, tier pemegang, dan kredit agent. Tidak satu pun fitur itu ada di kontrak.
  Semuanya `PLANNED`.
- Yang ada di kode:
  - `AgentTokenFactory`: pembuat agent bisa mencetak **satu** token ERC-20 per agent,
    dengan suplai tetap, seluruhnya dikirim ke pembuat. Token ini tidak terhubung ke fee,
    vault, atau hasil agent di kode mana pun.
  - `BuybackBurn`: memakai saldo token pembayaran (mis. stablecoin) yang ada di kontrak untuk
    membeli dan membakar token tertentu, dengan cooldown, oracle TWAP, dan batas slippage.
  - `FeeSplitter`: fee kinerja 15 persen dari profit yang direalisasikan, yaitu 10 persen
    untuk pembuat dan 5 persen untuk treasury protokol. Pembagian ini tertulis sebagai
    konstanta di kontrak.

## Apa yang token BUKAN

- **Bukan ekuitas.** Tidak ada hak atas perusahaan, aset, atau suara pemegang saham.
- **Bukan dividen.** Tidak ada kontrak yang membayar apa pun ke pemegang token.
- **Bukan klaim atas revenue.** Tidak ada hak hukum atau kontraktual atas fee protokol.
- **Tidak memengaruhi hasil agent.** Memegang, membeli, atau menjual token tidak mengubah
  keputusan, alokasi, atau risiko agent mana pun.

## Hal yang harus dibaca bersama daftar di atas

- **Buyback menciptakan hubungan ekonomi dengan revenue.** Kalau treasury protokol
  memindahkan fee ke `BuybackBurn`, revenue protokol dipakai untuk membeli token di pasar.
  Itu bukan klaim hukum, tapi secara ekonomi harga token bisa terkait dengan revenue.
  Keputusan memindahkan fee ke buyback tidak ada di kode. Itu keputusan operator, dan belum
  dipublikasikan sebagai kebijakan.
- **Token per agent mudah dibaca sebagai saham kinerja agent.** Nama dan asosiasinya dengan
  satu agent bisa membuat pembeli mengira nilainya mengikuti hasil agent. Kode tidak
  membuat hubungan itu, dan pembaca tidak boleh mengasumsikannya.
- Status hukum token belum dinilai penasihat hukum di yurisdiksi mana pun (lihat
  [legal/jurisdictions.md](legal/jurisdictions.md)).

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menolak klaim staking, diskon, atau tier di halaman `/token` dengan
menunjukkan bahwa kontraknya tidak ada. Pembaca juga bisa menolak klaim "token tidak
terkait revenue" kalau treasury pernah mengirim fee ke `BuybackBurn`. Transaksinya
terlihat onchain.
