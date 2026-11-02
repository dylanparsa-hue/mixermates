# MixerMates Privacy Notice — draft for owner review

**Draft date: 29 October 2026. Not approved or published.**

This draft describes the current public demo release, including its live Google sign-in. Text in square brackets needs an owner decision. The accompanying [review notes](PRIVACY_REVIEW_NOTES.md) identify operational details that must be confirmed before publication. The Bahasa Melayu version follows the English version; neither version takes precedence until the owner approves both.

---

## English

**Effective date: [DATE OF PUBLICATION]**

### 1. Who we are and how to contact us

MixerMates, at https://mixermates.com, is operated by **[OPERATOR'S FULL LEGAL NAME]**, **[POSTAL ADDRESS AND COUNTRY]**. This operator is responsible for the personal information covered by this notice.

For privacy questions, requests or complaints, contact **[CONFIRM PRIVACY EMAIL: mixermatesco@gmail.com]**. Please identify the account or issue concerned. Do not send your password, payment details or identity documents by ordinary email.

### 2. What this notice covers

MixerMates helps people discover events, maintain a profile and use available community and organizer features. This notice explains how we handle information when you browse the site, create or use an account, sign in with Google, share content or contact us.

The current release displays fictional demo events. Real ticket purchases, payment processing, paid organizer subscriptions and real admission are disabled. Do not submit a real payment or payment receipt for a demo event. Before enabling additional services that change how we handle personal information, we will update this notice and provide any required further explanation or choice.

### 3. Information we collect and its sources

| Information | Source and purpose |
| --- | --- |
| Account details: name, username, email address, date of birth and city | You provide these to create and manage an account, distinguish accounts and apply age restrictions. Your full date of birth and account email are not part of the ordinary public profile. |
| Password and sign-in records | If you use password signup or password-confirmed linking, we check your password and store a password hash rather than a readable password. We store session records and limited authentication/security records to manage access and prevent misuse. |
| Google identity details | If you choose Google sign-in, Google supplies identity information as explained in section 4. |
| Optional profile information | You may add a photo, cover image, biography, interests, website or Instagram handle. We use these to display your profile according to the relevant settings. |
| Community activity | We store saved events, follows, friendships, club memberships, privacy preferences, messages and notifications when you use those features. |
| Organizer and support information | Authorized organizers may submit event descriptions, venue details, images and review information. We also store reports, support correspondence and relevant administrative decisions. |
| Technical information | Requests to the site and its hosting infrastructure include information such as IP address, requested page, browser details and time. We use technical records and limited activity information to deliver the service, count event interactions, diagnose problems and protect against abuse. |

Required account fields are necessary to complete signup. Optional profile fields can be left blank. You can browse public events without an account, but account-dependent features will not work without the information needed for them.

Uploaded images may retain embedded metadata. Remove information you do not want to share before uploading, and do not put identity documents, health information or financial details in public images, profiles, messages or event descriptions.

### 4. Google sign-in and account linking

Google sign-in is optional. We request only `openid`, `email` and `profile` permissions. We use your unique Google account identifier, verified email address and name to authenticate you, prevent duplicate accounts and create or link your MixerMates account. Basic profile information may be returned under these permissions; the current implementation does not copy your Google profile photo into your MixerMates profile.

We do not request access to your Gmail messages, Google Contacts, Drive files or Calendar. Your date of birth and city are entered directly into MixerMates, not fetched from Google. We process Google's authorization response and identity token for sign-in validation. We do not retain Google access tokens, refresh tokens or the raw identity token in our account database.

We retain the Google account identifier and its association with your MixerMates account while that connection is needed. Temporary sign-in records help prevent forged or repeated requests. Google sign-in does not automatically give an account organizer or administrator authority.

An existing password account is linked only after you confirm its password and choose the Google account with the same email address. A matching email by itself does not silently link accounts.

You can remove MixerMates' permission through your Google Account's third-party connection settings. This does not itself delete your MixerMates account, remove the association from our database or immediately end an existing MixerMates session. Contact us to request removal of stored Google account information. If Google is your only login method, contact us about continued access before disconnecting it. Existing password users can continue to use their password.

### 5. How we use information

We use information to provide the features you request; authenticate and secure accounts; apply age and access restrictions; display profiles and events; support permitted community interactions; handle organizer submissions and support requests; and maintain records needed to investigate misuse and meet applicable obligations.

Optional promotional updates are off by default and can be controlled in profile settings. Service and security notices are separate from optional promotional messages. We do not sell Google account information or use it for advertising profiles, credit decisions or unrelated purposes. **[OWNER TO CONFIRM: no sale of other personal information and no use for AI model training.]**

### 6. Who can see information

- **Other users and visitors:** information you put in public profiles or public event content may be visible to the permitted audience. Profile discovery, Instagram display, club membership, attendance and badge settings control different kinds of visibility; they do not make everything on the account confidential. Public image links may remain accessible to someone who has the link.
- **Conversation participants:** messages are stored by MixerMates and available to the permitted participants. Do not treat messaging as an end-to-end encrypted service.
- **Authorized organizers and staff:** they can access information within their assigned event and operational permissions when those features are available. This does not give them general access to your account password or Google credentials.
- **Authorized service personnel and providers:** people who operate, secure or support MixerMates may need access for those purposes. Hostinger provides website/database hosting. Google provides optional identity verification. Opening interactive maps makes requests to OpenFreeMap, which receives technical request information and the map areas requested; we do not send it your MixerMates password or account profile. Email providers process correspondence you send to our support address.
- **Legal and safety recipients:** we may disclose relevant information where required by law or where necessary and legally permitted to investigate abuse, protect people or address a security incident.

Google, OpenFreeMap and other external websites also handle information under their own policies. See [Google's privacy policy](https://policies.google.com/privacy), [Hostinger's privacy policy](https://www.hostinger.com/legal/privacy-policy) and [OpenFreeMap's privacy policy](https://openfreemap.org/privacy/). Links to external sites do not give those sites access to your MixerMates account merely because a link is shown.

### 7. Cookies, browser storage and location

| Item | What it does | Normal browser lifetime |
| --- | --- | --- |
| Sign-in cookie (`vibey-session`) | Keeps your session associated with your account | Up to seven days; signing out ends the current session |
| Google flow cookie (`mm-google-flow`) | Binds a Google sign-in attempt to the browser that started it | Up to ten minutes; normally cleared when the flow ends |
| Appearance preference (`mixermates-theme`, local storage) | Remembers light, dark or system appearance | Until changed or browser storage is cleared |
| Event invitation reference, where used (session storage) | Carries an invitation through the relevant browser flow | For the tab's session, or until the app removes it |

These browser lifetimes are not deletion deadlines for database records or backups. Blocking necessary cookies can prevent login and account features. Clearing the appearance preference resets that preference.

The current application has no integrated advertising pixel or third-party behavioral analytics tracker. We do record limited first-party event interactions and security information. We use your supplied city and event locations, not your device's precise GPS location, for the current discovery and map features. Map requests can reveal the geographic areas you view to the map provider.

### 8. Storage, security and processing locations

Account and application information is stored in the hosted database and associated restricted backups. The live site uses HTTPS, hashed passwords, protected sign-in cookies and permission checks. Access is restricted to the people and systems that need it; these measures do not make any online service completely risk-free.

Hostinger and other providers may process information outside your country. **[CONFIRM HOSTING/BACKUP COUNTRIES, OTHER PROVIDERS, AND THE ARRANGEMENTS USED FOR INTERNATIONAL TRANSFERS.]** We will reflect the confirmed arrangements in the published notice rather than assume that all data stays in Malaysia.

### 9. Retention and deletion

We retain personal information for the purposes described in this notice, including providing your account and addressing security, support and applicable recordkeeping needs. **[INSERT THE APPROVED RETENTION AND DELETION SCHEDULE FOR ACCOUNTS, MESSAGES, UPLOADS, SUPPORT/AUDIT RECORDS AND BACKUPS.]**

In the current application, deactivating an account ends its sessions and makes the account inactive. It does **not** automatically erase its stored information. Authentication links can expire before their database records are cleaned up. Deleting or replacing a profile image does not by itself guarantee that every stored copy has been erased.

You can ask us to delete information using the contact in section 1. Some records may need to be retained for a specific legal or security reason; if so, we will explain the relevant limitation. **[CONFIRM WHO HANDLES THESE REQUESTS AND HOW DELETION AND BACKUP EXPIRY WILL BE CARRIED OUT.]**

### 10. Your choices, requests and complaints

You can edit available profile details and privacy preferences, choose whether to receive optional promotional updates, sign out and deactivate your account through its profile controls. Changing a setting cannot remove a copy that someone else already saved.

Contact us to request access to your personal information, correction of inaccurate information, deletion, removal of a Google association, or withdrawal or limitation of optional processing. We will assess your request under applicable law and explain any limits and effects on the features we can provide. We may need proportionate information to verify that the request comes from the account holder.

You can raise a complaint with our privacy contact. You may also contact the relevant data protection authority; in Malaysia, this is the Personal Data Protection Commissioner, whose official website is https://www.pdp.gov.my.

### 11. Age restrictions

The current signup flow rejects users under 13. Community discovery and social messaging require users to be at least 18, and individual events may have higher age requirements. Date of birth is used for these checks and is not shown as part of the ordinary public profile.

**[CONFIRM THE INTENDED MINIMUM AGE AND ANY REQUIRED PARENT/GUARDIAN PROCESS BEFORE PUBLICATION. IF THE SERVICE IS TO BE 18+ ONLY, UPDATE THE APPLICATION BEFORE MAKING THAT CLAIM.]** If you believe a child has provided information contrary to the applicable age requirements, contact us so we can assess and address it.

### 12. Changes to this notice

We will update the effective date when this notice changes. Where a change introduces a new use of information that requires an additional explanation or consent, we will provide that before starting the new use. This notice does not itself activate payments, subscriptions, admission or additional Google permissions.

---

## Bahasa Melayu

**Tarikh berkuat kuasa: [TARIKH PENERBITAN]**

### 1. Siapa kami dan cara menghubungi kami

MixerMates, di https://mixermates.com, dikendalikan oleh **[NAMA PENUH SAH PENGENDALI]**, **[ALAMAT POS DAN NEGARA]**. Pengendali ini bertanggungjawab terhadap maklumat peribadi yang diliputi oleh notis ini.

Untuk pertanyaan, permintaan atau aduan privasi, hubungi **[SAHKAN E-MEL PRIVASI: mixermatesco@gmail.com]**. Nyatakan akaun atau perkara yang berkaitan. Jangan hantarkan kata laluan, butiran pembayaran atau dokumen pengenalan melalui e-mel biasa.

### 2. Skop notis ini

MixerMates membantu pengguna menemui acara, mengurus profil serta menggunakan ciri komuniti dan penganjur yang tersedia. Notis ini menerangkan cara kami mengendalikan maklumat apabila anda melayari laman, membuat atau menggunakan akaun, log masuk dengan Google, berkongsi kandungan atau menghubungi kami.

Versi semasa memaparkan acara demo rekaan. Pembelian tiket sebenar, pemprosesan pembayaran, langganan penganjur berbayar dan kemasukan sebenar dinyahdayakan. Jangan buat pembayaran sebenar atau hantar resit pembayaran bagi acara demo. Sebelum mengaktifkan perkhidmatan tambahan yang mengubah cara maklumat peribadi dikendalikan, kami akan mengemas kini notis ini serta memberikan penjelasan atau pilihan tambahan yang diperlukan.

### 3. Maklumat yang dikumpul dan sumbernya

| Maklumat | Sumber dan tujuan |
| --- | --- |
| Butiran akaun: nama, nama pengguna, alamat e-mel, tarikh lahir dan bandar | Anda memberikannya untuk membuat dan mengurus akaun, membezakan akaun serta melaksanakan sekatan umur. Tarikh lahir penuh dan e-mel akaun bukan sebahagian daripada profil awam biasa. |
| Kata laluan dan rekod log masuk | Bagi pendaftaran dengan kata laluan atau pemautan yang memerlukan pengesahan kata laluan, kami menyemak kata laluan dan menyimpan nilai cincangnya, bukan kata laluan yang boleh dibaca. Rekod sesi serta rekod pengesahan/keselamatan terhad digunakan untuk mengurus akses dan mencegah penyalahgunaan. |
| Butiran identiti Google | Jika anda memilih log masuk Google, Google membekalkan maklumat identiti seperti yang diterangkan dalam seksyen 4. |
| Maklumat profil pilihan | Anda boleh menambah foto, imej muka depan, biografi, minat, laman web atau nama pengguna Instagram. Maklumat ini dipaparkan mengikut tetapan yang berkaitan. |
| Aktiviti komuniti | Kami menyimpan acara yang disimpan, hubungan mengikuti, persahabatan, keahlian kelab, pilihan privasi, mesej dan pemberitahuan apabila anda menggunakan ciri tersebut. |
| Maklumat penganjur dan sokongan | Penganjur yang dibenarkan boleh menyerahkan penerangan acara, butiran lokasi, imej dan maklumat semakan. Kami juga menyimpan laporan, surat-menyurat sokongan dan keputusan pentadbiran yang berkaitan. |
| Maklumat teknikal | Permintaan kepada laman dan infrastruktur pengehosan termasuk maklumat seperti alamat IP, halaman yang diminta, butiran pelayar dan masa. Rekod teknikal serta maklumat aktiviti terhad digunakan untuk menyediakan perkhidmatan, mengira interaksi acara, mengenal pasti masalah dan mencegah penyalahgunaan. |

Medan akaun wajib diperlukan untuk melengkapkan pendaftaran. Medan profil pilihan boleh dibiarkan kosong. Anda boleh melayari acara awam tanpa akaun, tetapi ciri yang memerlukan akaun tidak dapat digunakan tanpa maklumat yang diperlukan untuk ciri tersebut.

Imej yang dimuat naik mungkin masih mengandungi metadata terbenam. Buang maklumat yang tidak mahu dikongsi sebelum memuat naik. Jangan letakkan dokumen pengenalan, maklumat kesihatan atau butiran kewangan dalam imej awam, profil, mesej atau penerangan acara.

### 4. Log masuk Google dan pemautan akaun

Log masuk Google ialah pilihan. Kami hanya meminta kebenaran `openid`, `email` dan `profile`. Kami menggunakan pengecam unik akaun Google, alamat e-mel yang disahkan dan nama anda untuk mengesahkan identiti, mencegah akaun pendua serta membuat atau memautkan akaun MixerMates. Maklumat profil asas mungkin diterima melalui kebenaran ini; pelaksanaan semasa tidak menyalin foto profil Google ke profil MixerMates anda.

Kami tidak meminta akses kepada mesej Gmail, Google Contacts, fail Drive atau Calendar anda. Tarikh lahir dan bandar dimasukkan terus ke MixerMates, bukan diambil daripada Google. Respons kebenaran dan token identiti Google diproses untuk pengesahan log masuk. Token akses Google, token penyegaran dan token identiti mentah tidak disimpan dalam pangkalan data akaun kami.

Kami menyimpan pengecam akaun Google dan pautannya dengan akaun MixerMates selagi sambungan itu diperlukan. Rekod log masuk sementara membantu mencegah permintaan palsu atau berulang. Log masuk Google tidak secara automatik memberikan kuasa penganjur atau pentadbir.

Akaun sedia ada yang menggunakan kata laluan hanya dipautkan selepas anda mengesahkan kata laluannya dan memilih akaun Google dengan alamat e-mel yang sama. Padanan e-mel sahaja tidak memautkan akaun secara senyap.

Anda boleh membuang kebenaran MixerMates melalui tetapan sambungan pihak ketiga dalam Akaun Google anda. Tindakan ini tidak dengan sendirinya memadamkan akaun MixerMates, membuang pautan dalam pangkalan data kami atau menamatkan sesi MixerMates yang sedang aktif dengan serta-merta. Hubungi kami untuk meminta pemadaman maklumat akaun Google yang disimpan. Jika Google ialah satu-satunya kaedah log masuk anda, hubungi kami tentang akses seterusnya sebelum memutuskannya. Pengguna kata laluan sedia ada boleh terus menggunakan kata laluan mereka.

### 5. Cara maklumat digunakan

Kami menggunakan maklumat untuk menyediakan ciri yang anda minta; mengesahkan dan melindungi akaun; melaksanakan sekatan umur dan akses; memaparkan profil dan acara; menyokong interaksi komuniti yang dibenarkan; mengendalikan penyerahan penganjur serta permintaan sokongan; dan menyimpan rekod yang diperlukan untuk menyiasat penyalahgunaan serta memenuhi kewajipan yang terpakai.

Kemas kini promosi pilihan dimatikan secara lalai dan boleh dikawal melalui tetapan profil. Notis perkhidmatan dan keselamatan berasingan daripada mesej promosi pilihan. Kami tidak menjual maklumat akaun Google atau menggunakannya untuk membina profil pengiklanan, membuat keputusan kredit atau tujuan yang tidak berkaitan. **[PENGENDALI PERLU MENGESAHKAN: tiada penjualan maklumat peribadi lain dan tiada penggunaan untuk latihan model AI.]**

### 6. Siapa yang boleh melihat maklumat

- **Pengguna lain dan pelawat:** maklumat dalam profil awam atau kandungan acara awam boleh dilihat oleh khalayak yang dibenarkan. Tetapan penemuan profil, paparan Instagram, keahlian kelab, kehadiran dan lencana mengawal jenis keterlihatan yang berbeza; tetapan ini tidak menjadikan semua maklumat akaun sulit. Pautan imej awam mungkin masih boleh diakses oleh sesiapa yang mempunyai pautan itu.
- **Peserta perbualan:** mesej disimpan oleh MixerMates dan tersedia kepada peserta yang dibenarkan. Jangan anggap pemesejan sebagai perkhidmatan dengan penyulitan hujung ke hujung.
- **Penganjur dan kakitangan yang dibenarkan:** mereka boleh mengakses maklumat dalam skop acara serta kebenaran operasi yang diberikan apabila ciri tersebut tersedia. Ini tidak memberikan akses umum kepada kata laluan akaun atau kelayakan Google anda.
- **Petugas dan penyedia perkhidmatan yang dibenarkan:** pihak yang mengendalikan, melindungi atau menyokong MixerMates mungkin memerlukan akses untuk tujuan tersebut. Hostinger menyediakan pengehosan laman/pangkalan data. Google menyediakan pengesahan identiti pilihan. Membuka peta interaktif menghantar permintaan kepada OpenFreeMap, yang menerima maklumat teknikal permintaan serta kawasan peta yang diminta; kami tidak menghantar kata laluan atau profil akaun MixerMates kepadanya. Penyedia e-mel memproses surat-menyurat yang dihantar ke alamat sokongan kami.
- **Penerima bagi tujuan undang-undang dan keselamatan:** maklumat berkaitan boleh didedahkan jika diwajibkan oleh undang-undang, atau jika perlu dan dibenarkan undang-undang untuk menyiasat penyalahgunaan, melindungi orang ramai atau menangani insiden keselamatan.

Google, OpenFreeMap dan laman luar lain turut mengendalikan maklumat mengikut polisi mereka sendiri. Lihat [polisi privasi Google](https://policies.google.com/privacy), [polisi privasi Hostinger](https://www.hostinger.com/legal/privacy-policy) dan [polisi privasi OpenFreeMap](https://openfreemap.org/privacy/). Paparan pautan ke laman luar tidak dengan sendirinya memberikan laman tersebut akses kepada akaun MixerMates anda.

### 7. Kuki, storan pelayar dan lokasi

| Item | Fungsi | Tempoh biasa dalam pelayar |
| --- | --- | --- |
| Kuki log masuk (`vibey-session`) | Memautkan sesi anda kepada akaun anda | Sehingga tujuh hari; log keluar menamatkan sesi semasa |
| Kuki aliran Google (`mm-google-flow`) | Memautkan cubaan log masuk Google kepada pelayar yang memulakannya | Sehingga sepuluh minit; biasanya dibuang apabila aliran berakhir |
| Pilihan paparan (`mixermates-theme`, storan setempat) | Mengingati paparan cerah, gelap atau sistem | Sehingga diubah atau storan pelayar dikosongkan |
| Rujukan jemputan acara, jika digunakan (storan sesi) | Membawa jemputan melalui aliran pelayar berkaitan | Sepanjang sesi tab atau sehingga aplikasi membuangnya |

Tempoh dalam pelayar ini bukan tarikh akhir pemadaman rekod pangkalan data atau sandaran. Menyekat kuki yang diperlukan boleh menghalang log masuk dan ciri akaun. Mengosongkan pilihan paparan akan menetapkan semula pilihan itu.

Aplikasi semasa tidak mengintegrasikan piksel pengiklanan atau penjejak analitik tingkah laku pihak ketiga. Kami merekodkan interaksi acara pihak pertama dan maklumat keselamatan yang terhad. Ciri penemuan dan peta semasa menggunakan bandar yang anda berikan serta lokasi acara, bukan lokasi GPS tepat peranti anda. Permintaan peta boleh mendedahkan kawasan geografi yang anda lihat kepada penyedia peta.

### 8. Penyimpanan, keselamatan dan lokasi pemprosesan

Maklumat akaun dan aplikasi disimpan dalam pangkalan data yang dihoskan serta sandaran berkaitan dengan akses terhad. Laman langsung menggunakan HTTPS, cincangan kata laluan, kuki log masuk yang dilindungi dan semakan kebenaran. Akses dihadkan kepada pihak dan sistem yang memerlukannya; langkah ini tidak menjadikan mana-mana perkhidmatan dalam talian bebas risiko sepenuhnya.

Hostinger dan penyedia lain mungkin memproses maklumat di luar negara anda. **[SAHKAN NEGARA PENGEHOSAN/SANDARAN, PENYEDIA LAIN DAN PENGATURAN BAGI PEMINDAHAN ANTARABANGSA.]** Notis yang diterbitkan akan mencerminkan pengaturan yang disahkan, bukan mengandaikan bahawa semua data kekal di Malaysia.

### 9. Tempoh penyimpanan dan pemadaman

Maklumat peribadi disimpan untuk tujuan dalam notis ini, termasuk menyediakan akaun serta memenuhi keperluan keselamatan, sokongan dan penyimpanan rekod yang terpakai. **[MASUKKAN JADUAL PENYIMPANAN DAN PEMADAMAN YANG DILULUSKAN UNTUK AKAUN, MESEJ, MUAT NAIK, REKOD SOKONGAN/AUDIT DAN SANDARAN.]**

Dalam aplikasi semasa, menyahaktifkan akaun menamatkan sesinya dan menjadikan akaun tidak aktif. Tindakan ini **tidak** memadamkan maklumat tersimpan secara automatik. Pautan pengesahan boleh tamat tempoh sebelum rekod pangkalan datanya dibersihkan. Memadam atau menggantikan imej profil tidak dengan sendirinya menjamin bahawa setiap salinan tersimpan telah dipadamkan.

Anda boleh meminta pemadaman maklumat melalui butiran hubungan dalam seksyen 1. Sesetengah rekod mungkin perlu disimpan atas sebab undang-undang atau keselamatan tertentu; jika demikian, kami akan menerangkan batasan yang berkaitan. **[SAHKAN PIHAK YANG MENGENDALIKAN PERMINTAAN INI SERTA CARA PEMADAMAN DAN PELUPUSAN SANDARAN DILAKSANAKAN.]**

### 10. Pilihan, permintaan dan aduan anda

Anda boleh mengedit butiran profil serta pilihan privasi yang tersedia, memilih sama ada hendak menerima kemas kini promosi pilihan, log keluar dan menyahaktifkan akaun melalui kawalan profil. Mengubah tetapan tidak boleh membuang salinan yang telah disimpan oleh orang lain.

Hubungi kami untuk meminta akses kepada maklumat peribadi anda, pembetulan maklumat yang tidak tepat, pemadaman, pembuangan pautan Google, atau penarikan balik atau pengehadan pemprosesan pilihan. Kami akan menilai permintaan mengikut undang-undang yang terpakai serta menerangkan apa-apa batasan dan kesannya terhadap ciri yang dapat disediakan. Maklumat yang sepadan dan munasabah mungkin diperlukan untuk mengesahkan bahawa permintaan datang daripada pemegang akaun.

Anda boleh mengemukakan aduan kepada hubungan privasi kami. Anda juga boleh menghubungi pihak berkuasa perlindungan data yang berkaitan; di Malaysia, pihak tersebut ialah Pesuruhjaya Perlindungan Data Peribadi, dengan laman rasmi https://www.pdp.gov.my.

### 11. Sekatan umur

Aliran pendaftaran semasa menolak pengguna di bawah umur 13 tahun. Penemuan komuniti dan pemesejan sosial memerlukan umur sekurang-kurangnya 18 tahun, dan acara tertentu mungkin mempunyai syarat umur yang lebih tinggi. Tarikh lahir digunakan bagi semakan ini dan tidak dipaparkan sebagai sebahagian daripada profil awam biasa.

**[SAHKAN UMUR MINIMUM YANG DIHASRATKAN DAN APA-APA PROSES IBU BAPA/PENJAGA YANG DIPERLUKAN SEBELUM PENERBITAN. JIKA PERKHIDMATAN HANYA UNTUK UMUR 18+, KEMAS KINI APLIKASI SEBELUM MEMBUAT PERNYATAAN TERSEBUT.]** Jika anda percaya seorang kanak-kanak telah memberikan maklumat yang bercanggah dengan syarat umur berkenaan, hubungi kami supaya kami boleh menilai dan menanganinya.

### 12. Perubahan kepada notis ini

Kami akan mengemas kini tarikh berkuat kuasa apabila notis ini berubah. Jika perubahan memperkenalkan penggunaan maklumat baharu yang memerlukan penjelasan atau persetujuan tambahan, kami akan memberikannya sebelum memulakan penggunaan baharu itu. Notis ini tidak dengan sendirinya mengaktifkan pembayaran, langganan, kemasukan atau kebenaran Google tambahan.
