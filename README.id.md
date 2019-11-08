[![Build Status](https://travis-ci.org/osmlab/name-suggestion-index.svg?branch=master)](https://travis-ci.org/osmlab/name-suggestion-index)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

## name-suggestion-index

Merk umum nama canonical untuk OpenStreetMap


### Apa ini ?

Tujuan dari proyek ini adalah untuk mempertahankan [canonical](https://en.wikipedia.org/wiki/Canonicalization) daftar nama umum yang digunakan untuk memberi saran untuk ejaan dan fitur tagging yang konsisten di OpenStreetMap.

[Tonton videonya](https://2019.stateofthemap.us/program/sat/mapping-brands-with-the-name-suggestion-index.html) dari ceramah kami di State of Map US 2019 untuk mempelajari lebih lanjut tentang proyek ini!


### Telusuri indeks

Anda dapat menulusuri indeks di https://nsi.guide/ untuk melihat merk mana yang hilang dari link Wikidata, atau yang tidak komplet di halaman Wikipedia.

### Bagaimana ini digunakan

Saat fitur peta dibuat di OpenStreetMap, mereka tidak selalu konsisten tentang bagaimana mereka memberi nama dan menandai sesuatu. Contoh, kita dapat memilih kata `McDonald's` yang ditandai sebagai `amenity=fast_food` tetapi kita juga melihat banyak contoh untuk pengejaan yang lain (`Mc Donald's`, `McDonalds`, `McDonald’s`) dan menandai (`amenity=restaurant`).

Membangun indeks nama canonical memungkina dua hal yang sangat berguna:
- Kita dapat menyarankan cara yang paling "benar" untuk menandai hal-hal yang dibuat pengguna saat menyunting
- Kita dapat memindai OSM data untuk fitur "salah" dan menhasilkan daftar untuk ditinjau dan dibersihkan

<img width="1017px" alt="Name Suggestion Index in use in iD" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/nsi-in-iD.gif"/>

*name-suggestion-index saat digunakan di ID untuk menambahkan item baru*

Saat ini digunakan di:
* ID (lihat dibawah)
* [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
* Preset JOSM yang tersedia

### Ikut berpartisipasilah!

* Baca [Kode Etik](CODE_OF_CONDUCT.md) proyek dan ingat untuk bersikap baik satu sama lain.
* Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk into tentang bagaimana cara berkonstribusi pada indeks ini.

Kami selalu mencari bantuan!  Jika kaum memiliki pertanyaan atau ingin menghubungi maintainer, ping  `bhousel` di:
* [OpenStreetMap US Slack](https://slack.openstreetmap.us/)
(`#poi` or `#general` channels)


### Prasyarat

* [Node.js](https://nodejs.org/) versi 8 or terbaru
* [`git`](https://www.atlassian.com/git/tutorials/install-git/) untuk platform anda


### Instalasi

* Clone proyek ini, contoh:
  `git clone git@github.com:osmlab/name-suggestion-index.git`
* `cd` ke dalam proyek folder,
* Jalankan `npm install` untuk instalasi pustaka


### Tentang indeks

#### File yang dihasilkan (jangan disunting):

Preset file (digunakan oleh OSM editors):
* `dist/name-suggestions.json` - Name suggestion presets
* `dist/name-suggestions.min.json` - Name suggestion presets, minified
* `dist/name-suggestions.presets.xml` - Name suggestion presets, as JOSM-style preset XML

Daftar nama:
* `dist/names_all.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/names_discard.json` - subset of `names_all` we are discarding
* `dist/names_keep.json` - subset of `names_all` we are keeping
* `dist/wikidata.json` - cached brand data retrieved from Wikidata

#### Konfigurasi file (sunting bagian ini):

* `config/*`
  * `config/filters.json`- Regular expressions yang digunakan untuk memfilter `names_all` ke `names_keep` / `names_discard`
* `brands/*` - Konfirugasi file untuk  setiap jenis merk bisnis, diorganisasikan oleh tag OpenStreetMap
  * `brands/amenity/*.json`
  * `brands/leisure/*.json`
  * `brands/shop/*.json`
  * `brands/tourism/*.json`
  * `brands/office/*.json`

:point_right: Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk info tentang bagaimana cara konstribusi di indeks ini.


### Membangun indeks

* `npm run build`
  * Memperbarui `dist/names_keep.json` dan `dist/names_discard.json`
  * Setiap entri baru dari `names_keep` yang belum ada di dalam indeks akan ditambahkan ke dalamnya
  * Outputs many warnings to suggest updates to `brands/**/*.json`
  * Keluarkan banyak peringatan untuk menyarankan pembaruan `brands/**/*.json`


### Perintah lain

* `npm run wikidata` - Ambil data berguna dari label - Wikidata, deskripsi, logo, dll.
* `npm run` - Daftar tools lainnya yang tersedia

### Memperbarui `dist/names_all.json` dari planet

Ini akan memakan waktu yang lama dan banyak ruang disk. Ini dapat dilakukan sesekali oleh pengelola proyek.
Anda tidak berlu untuk melakukan tahapan ini untuk berkonstribusi pada indeks.

- Instal `osmium` alat commandline dan paket node (mungkin hanya tersedia di beberapa environtments)
  - `apt-get install osmium-tool` atau `brew install osmium-tool` atau serupa
  - `npm install --no-save osmium`
- [Unduh planet](http://planet.osm.org/pbf/)
  - `curl -L -o planet-latest.osm.pbf https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf`
- File planet prefilter hanya menyertakan nama item dengan kunci yang kami cari:
  - `osmium tags-filter planet-latest.osm.pbf -R name -o named.osm.pbf`
  - `osmium tags-filter named.osm.pbf -R amenity,shop,leisure,tourism,office -o wanted.osm.pbf`
- Jalankan `node build_all_names wanted.osm.pbf`
  - hasilnya akan berada di `dist/names_all.json`
  - `git add dist/names_all.json && git commit -m 'Updated dist/names_all.json'`


### Lisensi

name-suggestion-index tersedia dibawah [3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause).
Lihat [LICENSE.md](LICENSE.md) file untuk lebih lanjut.
