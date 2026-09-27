import type { Locale } from './config'

export type CallUi = {
  call: string
  kicker: string
  title: string
  previewNote: string
  close: string
  stepLink: string
  stepGuest: string
  stepLive: string
  copyMessage: string
  copied: string
  waiting: string
  seeGuest: string
  shareLead: string
  shareBody: string
  incoming: string
  joinTitle: string
  youSpeak: string
  youHear: string
  guestBrief: string
  join: string
  connected: string
  youSpeakNow: string
  theyHear: string
  hangUp: string
  failed: string
}

export function fillCall(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}

const ru: CallUi = {
  call: 'Позвонить',
  kicker: 'Звонок по ссылке',
  title: 'Отправьте ссылку',
  previewNote: 'Ссылка соединяет два телефона. Собеседник слышит только перевод в наушниках.',
  failed: 'Звонок не соединился.',
  close: 'Закрыть',
  stepLink: 'Ссылка',
  stepGuest: 'Собеседник',
  stepLive: 'Разговор',
  copyMessage: 'Скопировать сообщение',
  copied: 'Сообщение скопировано',
  waiting: 'Ждём, пока собеседник откроет ссылку в браузере',
  seeGuest: 'Посмотреть экран собеседника',
  shareLead: 'Это уйдёт собеседнику вместе со ссылкой',
  shareBody:
    'Откройте ссылку в браузере. Разговор только в наушниках: вы не услышите мой голос, только перевод. Я говорю: {youLanguage}. Вы говорите: {otherLanguage}.\n{link}',
  incoming: 'Вам прислали ссылку',
  joinTitle: 'Войти в разговор',
  youSpeak: 'Вы говорите',
  youHear: 'Вы слышите',
  guestBrief:
    'Откройте ссылку в браузере на телефоне. Разговор идёт только в наушниках: чужой голос вы не услышите, только перевод. Наденьте наушники до входа, иначе микрофон поймает перевод.',
  join: 'Войти',
  connected: 'Соединено',
  youSpeakNow: 'Говорите вы',
  theyHear: 'Слышит перевод',
  hangUp: 'Завершить звонок',
}

const en: CallUi = {
  call: 'Call',
  kicker: 'Call by link',
  title: 'Send the link',
  previewNote: 'The link connects two phones. The other person hears only the translation, through headphones.',
  failed: 'The call did not connect.',
  close: 'Close',
  stepLink: 'Link',
  stepGuest: 'Other person',
  stepLive: 'Talk',
  copyMessage: 'Copy the message',
  copied: 'Message copied',
  waiting: 'Waiting for them to open the link in a browser',
  seeGuest: 'See their screen',
  shareLead: 'This goes to them with the link',
  shareBody:
    'Open the link in a browser. The talk is only through headphones: you will not hear my voice, only the translation. I speak {youLanguage}. You speak {otherLanguage}.\n{link}',
  incoming: 'Someone sent you a link',
  joinTitle: 'Join the conversation',
  youSpeak: 'You speak',
  youHear: 'You hear',
  guestBrief:
    'Open the link in the phone browser. The talk is only through headphones: you will not hear their voice, only the translation. Put the headphones on before you join, or the microphone will pick up the translation.',
  join: 'Join',
  connected: 'Connected',
  youSpeakNow: 'You are speaking',
  theyHear: 'Hears the translation',
  hangUp: 'End the call',
}

const es: CallUi = {
  call: 'Llamar',
  kicker: 'Llamada por enlace',
  title: 'Envíe el enlace',
  previewNote: 'El enlace conecta dos teléfonos. La otra persona oye solo la traducción, con auriculares.',
  failed: 'La llamada no se conectó.',
  close: 'Cerrar',
  stepLink: 'Enlace',
  stepGuest: 'La otra persona',
  stepLive: 'Conversación',
  copyMessage: 'Copiar el mensaje',
  copied: 'Mensaje copiado',
  waiting: 'Esperamos a que abra el enlace en el navegador',
  seeGuest: 'Ver su pantalla',
  shareLead: 'Esto se envía con el enlace',
  shareBody:
    'Abra el enlace en el navegador. La conversación es solo con auriculares: no oirá mi voz, solo la traducción. Yo hablo {youLanguage}. Usted habla {otherLanguage}.\n{link}',
  incoming: 'Le enviaron un enlace',
  joinTitle: 'Entrar en la conversación',
  youSpeak: 'Usted habla',
  youHear: 'Usted oye',
  guestBrief:
    'Abra el enlace en el navegador del teléfono. La conversación es solo con auriculares: no oirá la voz de la otra persona, solo la traducción. Póngase los auriculares antes de entrar, si no el micrófono recogerá la traducción.',
  join: 'Entrar',
  connected: 'Conectado',
  youSpeakNow: 'Habla usted',
  theyHear: 'Oye la traducción',
  hangUp: 'Terminar la llamada',
}

const fr: CallUi = {
  call: 'Appeler',
  kicker: 'Appel par lien',
  title: 'Envoyez le lien',
  previewNote: 'Le lien relie deux téléphones. L’autre personne n’entend que la traduction, dans les écouteurs.',
  failed: 'L’appel ne s’est pas connecté.',
  close: 'Fermer',
  stepLink: 'Lien',
  stepGuest: "L'autre personne",
  stepLive: 'Conversation',
  copyMessage: 'Copier le message',
  copied: 'Message copié',
  waiting: "En attente qu'il ou elle ouvre le lien dans le navigateur",
  seeGuest: 'Voir son écran',
  shareLead: 'Ceci part avec le lien',
  shareBody:
    "Ouvrez le lien dans le navigateur. La conversation passe seulement par les écouteurs : vous n'entendrez pas ma voix, seulement la traduction. Je parle {youLanguage}. Vous parlez {otherLanguage}.\n{link}",
  incoming: 'On vous a envoyé un lien',
  joinTitle: 'Entrer dans la conversation',
  youSpeak: 'Vous parlez',
  youHear: 'Vous entendez',
  guestBrief:
    "Ouvrez le lien dans le navigateur du téléphone. La conversation passe seulement par les écouteurs : vous n'entendrez pas sa voix, seulement la traduction. Mettez les écouteurs avant d'entrer, sinon le micro captera la traduction.",
  join: 'Entrer',
  connected: 'Connecté',
  youSpeakNow: "C'est vous qui parlez",
  theyHear: 'Entend la traduction',
  hangUp: "Terminer l'appel",
}

const ar: CallUi = {
  call: 'اتصال',
  kicker: 'اتصال عبر رابط',
  title: 'أرسل الرابط',
  previewNote: 'الرابط يصل بين هاتفين. الطرف الآخر يسمع الترجمة فقط، عبر السماعات.',
  failed: 'لم يتصل الاتصال.',
  close: 'إغلاق',
  stepLink: 'الرابط',
  stepGuest: 'الطرف الآخر',
  stepLive: 'الحديث',
  copyMessage: 'نسخ الرسالة',
  copied: 'تم نسخ الرسالة',
  waiting: 'ننتظر حتى يفتح الرابط في المتصفح',
  seeGuest: 'انظر شاشته',
  shareLead: 'هذا يُرسل مع الرابط',
  shareBody:
    'افتح الرابط في المتصفح. الحديث فقط عبر السماعات: لن تسمع صوتي، بل الترجمة فقط. أنا أتحدث {youLanguage}. أنت تتحدث {otherLanguage}.\n{link}',
  incoming: 'أُرسل إليك رابط',
  joinTitle: 'الدخول إلى الحديث',
  youSpeak: 'أنت تتحدث',
  youHear: 'أنت تسمع',
  guestBrief:
    'افتح الرابط في متصفح الهاتف. الحديث يكون فقط عبر السماعات: لن تسمع صوت الشخص، بل الترجمة فقط. ضع السماعات قبل الدخول، وإلا سيلتقط الميكروفون الترجمة.',
  join: 'دخول',
  connected: 'متصل',
  youSpeakNow: 'أنت تتحدث',
  theyHear: 'يسمع الترجمة',
  hangUp: 'إنهاء الاتصال',
}

const hi: CallUi = {
  call: 'कॉल करें',
  kicker: 'लिंक से कॉल',
  title: 'लिंक भेजें',
  previewNote: 'लिंक दो फ़ोन जोड़ता है। दूसरा व्यक्ति सिर्फ़ अनुवाद सुनता है, हेडफ़ोन में।',
  failed: 'कॉल नहीं जुड़ी।',
  close: 'बंद करें',
  stepLink: 'लिंक',
  stepGuest: 'दूसरा व्यक्ति',
  stepLive: 'बातचीत',
  copyMessage: 'संदेश कॉपी करें',
  copied: 'संदेश कॉपी हो गया',
  waiting: 'इंतज़ार है कि वे ब्राउज़र में लिंक खोलें',
  seeGuest: 'उनकी स्क्रीन देखें',
  shareLead: 'यह लिंक के साथ जाएगा',
  shareBody:
    'ब्राउज़र में लिंक खोलें। बात सिर्फ़ हेडफ़ोन में है: आपको मेरी आवाज़ नहीं, सिर्फ़ अनुवाद सुनाई देगा। मैं {youLanguage} बोलता हूँ। आप {otherLanguage} बोलते हैं।\n{link}',
  incoming: 'आपको एक लिंक मिला है',
  joinTitle: 'बातचीत में आएँ',
  youSpeak: 'आप बोलते हैं',
  youHear: 'आप सुनते हैं',
  guestBrief:
    'फ़ोन के ब्राउज़र में लिंक खोलें। बात सिर्फ़ हेडफ़ोन में होती है: आपको उनकी आवाज़ नहीं सुनाई देगी, सिर्फ़ अनुवाद। अंदर आने से पहले हेडफ़ोन लगाएँ, नहीं तो माइक अनुवाद पकड़ लेगा।',
  join: 'अंदर आएँ',
  connected: 'जुड़ गया',
  youSpeakNow: 'आप बोल रहे हैं',
  theyHear: 'अनुवाद सुनता है',
  hangUp: 'कॉल बंद करें',
}

const pt: CallUi = {
  call: 'Ligar',
  kicker: 'Ligação por link',
  title: 'Envie o link',
  previewNote: 'O link liga dois telefones. A outra pessoa ouve só a tradução, no fone.',
  failed: 'A ligação não conectou.',
  close: 'Fechar',
  stepLink: 'Link',
  stepGuest: 'A outra pessoa',
  stepLive: 'Conversa',
  copyMessage: 'Copiar a mensagem',
  copied: 'Mensagem copiada',
  waiting: 'Esperando a pessoa abrir o link no navegador',
  seeGuest: 'Ver a tela dela',
  shareLead: 'Isto vai junto com o link',
  shareBody:
    'Abra o link no navegador. A conversa é só no fone: você não ouve a minha voz, só a tradução. Eu falo {youLanguage}. Você fala {otherLanguage}.\n{link}',
  incoming: 'Enviaram um link para você',
  joinTitle: 'Entrar na conversa',
  youSpeak: 'Você fala',
  youHear: 'Você ouve',
  guestBrief:
    'Abra o link no navegador do telefone. A conversa é só no fone: você não ouve a voz da outra pessoa, só a tradução. Coloque o fone antes de entrar, senão o microfone pega a tradução.',
  join: 'Entrar',
  connected: 'Conectado',
  youSpeakNow: 'Você está falando',
  theyHear: 'Ouve a tradução',
  hangUp: 'Encerrar a ligação',
}

const id: CallUi = {
  call: 'Telepon',
  kicker: 'Panggilan lewat tautan',
  title: 'Kirim tautannya',
  previewNote: 'Tautan menghubungkan dua ponsel. Lawan bicara hanya mendengar terjemahan, lewat headphone.',
  failed: 'Panggilan tidak tersambung.',
  close: 'Tutup',
  stepLink: 'Tautan',
  stepGuest: 'Lawan bicara',
  stepLive: 'Percakapan',
  copyMessage: 'Salin pesan',
  copied: 'Pesan tersalin',
  waiting: 'Menunggu dia membuka tautan di peramban',
  seeGuest: 'Lihat layarnya',
  shareLead: 'Ini ikut terkirim bersama tautan',
  shareBody:
    'Buka tautan di peramban. Percakapan hanya lewat headphone: Anda tidak mendengar suara saya, hanya terjemahan. Saya berbicara {youLanguage}. Anda berbicara {otherLanguage}.\n{link}',
  incoming: 'Anda menerima tautan',
  joinTitle: 'Masuk ke percakapan',
  youSpeak: 'Anda berbicara',
  youHear: 'Anda mendengar',
  guestBrief:
    'Buka tautan di peramban ponsel. Percakapan hanya lewat headphone: Anda tidak mendengar suaranya, hanya terjemahan. Pasang headphone sebelum masuk, kalau tidak mikrofon akan menangkap terjemahan.',
  join: 'Masuk',
  connected: 'Tersambung',
  youSpeakNow: 'Anda yang berbicara',
  theyHear: 'Mendengar terjemahan',
  hangUp: 'Akhiri panggilan',
}

const ms: CallUi = {
  call: 'Panggil',
  kicker: 'Panggilan melalui pautan',
  title: 'Hantar pautan',
  previewNote: 'Pautan menyambungkan dua telefon. Orang lain hanya mendengar terjemahan, melalui fon kepala.',
  failed: 'Panggilan tidak bersambung.',
  close: 'Tutup',
  stepLink: 'Pautan',
  stepGuest: 'Orang lain',
  stepLive: 'Perbualan',
  copyMessage: 'Salin mesej',
  copied: 'Mesej disalin',
  waiting: 'Menunggu dia buka pautan dalam pelayar',
  seeGuest: 'Lihat skrinnya',
  shareLead: 'Ini dihantar bersama pautan',
  shareBody:
    'Buka pautan dalam pelayar. Perbualan hanya melalui fon kepala: anda tidak mendengar suara saya, hanya terjemahan. Saya bercakap {youLanguage}. Anda bercakap {otherLanguage}.\n{link}',
  incoming: 'Anda menerima pautan',
  joinTitle: 'Masuk perbualan',
  youSpeak: 'Anda bercakap',
  youHear: 'Anda mendengar',
  guestBrief:
    'Buka pautan dalam pelayar telefon. Perbualan hanya melalui fon kepala: anda tidak mendengar suaranya, hanya terjemahan. Pakai fon kepala sebelum masuk, jika tidak mikrofon akan tangkap terjemahan.',
  join: 'Masuk',
  connected: 'Bersambung',
  youSpeakNow: 'Anda yang bercakap',
  theyHear: 'Mendengar terjemahan',
  hangUp: 'Tamatkan panggilan',
}

const tr: CallUi = {
  call: 'Ara',
  kicker: 'Bağlantıyla arama',
  title: 'Bağlantıyı gönderin',
  previewNote: 'Bağlantı iki telefonu bağlar. Karşı taraf yalnız çeviriyi duyar, kulaklıkta.',
  failed: 'Arama bağlanmadı.',
  close: 'Kapat',
  stepLink: 'Bağlantı',
  stepGuest: 'Karşı taraf',
  stepLive: 'Konuşma',
  copyMessage: 'Mesajı kopyala',
  copied: 'Mesaj kopyalandı',
  waiting: 'Karşı tarafın bağlantıyı tarayıcıda açmasını bekliyoruz',
  seeGuest: 'Onun ekranına bakın',
  shareLead: 'Bu, bağlantıyla birlikte gider',
  shareBody:
    'Bağlantıyı tarayıcıda açın. Konuşma yalnız kulaklıktadır: sesimi duymazsınız, yalnız çeviriyi duyarsınız. Ben {youLanguage} konuşurum. Siz {otherLanguage} konuşursunuz.\n{link}',
  incoming: 'Size bir bağlantı geldi',
  joinTitle: 'Konuşmaya girin',
  youSpeak: 'Siz konuşursunuz',
  youHear: 'Siz duyarsınız',
  guestBrief:
    'Bağlantıyı telefonun tarayıcısında açın. Konuşma yalnız kulaklıktadır: karşı tarafın sesini duymazsınız, yalnız çeviriyi duyarsınız. Girişten önce kulaklığı takın, yoksa mikrofon çeviriyi alır.',
  join: 'Gir',
  connected: 'Bağlandı',
  youSpeakNow: 'Siz konuşuyorsunuz',
  theyHear: 'Çeviriyi duyar',
  hangUp: 'Aramayı bitir',
}

const zh: CallUi = {
  call: '呼叫',
  kicker: '通过链接通话',
  title: '发送链接',
  previewNote: '链接接通两部手机。对方只在耳机里听到翻译。',
  failed: '通话没有接通。',
  close: '关闭',
  stepLink: '链接',
  stepGuest: '对方',
  stepLive: '通话',
  copyMessage: '复制消息',
  copied: '已复制消息',
  waiting: '等待对方在浏览器中打开链接',
  seeGuest: '查看对方看到的画面',
  shareLead: '这段话会和链接一起发给对方',
  shareBody:
    '请在浏览器中打开链接。通话只在耳机里进行：您听不到我的声音，只能听到翻译。我说{youLanguage}。您说{otherLanguage}。\n{link}',
  incoming: '有人发给您一个链接',
  joinTitle: '进入通话',
  youSpeak: '您说',
  youHear: '您听到',
  guestBrief:
    '请在手机浏览器中打开链接。通话只在耳机里进行：您听不到对方的原声，只能听到翻译。进入前请戴上耳机，否则麦克风会收到翻译。',
  join: '进入',
  connected: '已接通',
  youSpeakNow: '您在说',
  theyHear: '听到翻译',
  hangUp: '结束通话',
}

export const callUi: Record<Locale, CallUi> = {
  ru,
  en,
  es,
  fr,
  ar,
  hi,
  'pt-BR': pt,
  id,
  ms,
  tr,
  'zh-CN': zh,
}
