import type { Lang } from './types';

/** Текст страницы «Конфиденциальность»: заголовок и разделы на каждом языке. */
export const PRIVACY_UPDATED = '2026-10-26';

type Section = { h: string; p: string[] };
export const PRIVACY: Record<Lang, { title: string; intro: string; updated: string; sections: Section[] }> = {
  uk: {
    title: 'Конфіденційність', updated: 'Оновлено', intro: 'Premiero збирає якомога менше даних. Ось що саме і навіщо.',
    sections: [
      { h: 'Без входу', p: ['Ваш список «Хочу подивитися» і вибрані стримінги зберігаються лише у вашому браузері. Ми їх не бачимо.'] },
      { h: 'Якщо ви входите через Google', p: ['Ми отримуємо від Google ваше ім’я, електронну пошту, фото профілю й ідентифікатор акаунта. Пароль від Google ми не бачимо і не зберігаємо.', 'Ми зберігаємо ваш список і вибрані стримінги, щоб вони були доступні на всіх ваших пристроях.'] },
      { h: 'Де зберігаються дані', p: ['Сайт працює на Google Cloud і Cloudflare, дані акаунтів зберігаються в базі Upstash. Ми не продаємо й не передаємо ваші дані іншим компаніям.'] },
      { h: 'Cookie', p: ['Після входу ми ставимо одну cookie, щоб пам’ятати, що ви увійшли. Ще одна cookie запам’ятовує вибрану мову й країну. Рекламних cookie немає.', 'Статистику відвідувань ми рахуємо через Cloudflare Web Analytics: без cookie і без даних, за якими можна впізнати людину.'] },
      { h: 'Telegram-бот', p: ['Якщо ви підключите бота, ми зберігаємо ідентифікатор вашого чату в Telegram, а також мову й країну нагадувань. Вимкнути можна будь-коли в «Моєму списку» або командою /stop у боті.'] },
      { h: 'Листи на пошту', p: ['Листи приходять, лише якщо ви самі ввімкнете їх у «Моєму списку». Ми надсилаємо їх на адресу вашого акаунта Google через сервіс Resend. У кожному листі є посилання «Відписатися».'] },
      { h: 'Повідомлення про помилки', p: ['Коли ви повідомляєте про неправильну дату або пропонуєте реліз, ми зберігаємо ваше повідомлення, адресу сторінки і, якщо ви ввійшли, вашу пошту — щоб перевірити виправлення.'] },
      { h: 'Як видалити дані', p: ['Відкрийте «Мій список», унизу сторінки розгорніть «Налаштування акаунта» і натисніть «Видалити акаунт». Профіль, список і підписки буде видалено одразу й назавжди.'] },
      { h: 'Звідки дані про релізи', p: ['Дані про фільми й серіали надає TMDB, про ігри — IGDB.com. Особистих даних ми їм не передаємо.'] },
    ],
  },
  en: {
    title: 'Privacy', updated: 'Updated', intro: 'Premiero collects as little data as possible. Here is exactly what and why.',
    sections: [
      { h: 'Without signing in', p: ['Your “Want to watch” list and chosen streaming services are stored only in your browser. We cannot see them.'] },
      { h: 'If you sign in with Google', p: ['Google gives us your name, email address, profile photo and account ID. We never see or store your Google password.', 'We store your list and chosen streaming services so they are available on all your devices.'] },
      { h: 'Where the data is stored', p: ['The site runs on Google Cloud and Cloudflare and account data is stored in an Upstash database. We do not sell your data or share it with other companies.'] },
      { h: 'Cookies', p: ['After you sign in we set one cookie to remember that you are signed in. Another cookie remembers your language and country. There are no advertising cookies.', 'We count visits with Cloudflare Web Analytics, which uses no cookies and no data that could identify you.'] },
      { h: 'Telegram bot', p: ['If you connect the bot, we store your Telegram chat ID along with the language and country of your reminders. You can turn it off at any time in “My list” or with /stop in the bot.'] },
      { h: 'Emails', p: ['Emails only come if you turn them on yourself in “My list”. We send them to your Google account address through the Resend service. Every email has an unsubscribe link.'] },
      { h: 'Error reports', p: ['When you report a wrong date or submit a release, we store your message, the page address and, if you are signed in, your email, so that we can check the correction.'] },
      { h: 'How to delete your data', p: ['Open “My list”, expand “Account settings” at the bottom of the page and choose “Delete account”. Your profile, list and subscriptions are deleted immediately and permanently.'] },
      { h: 'Where release data comes from', p: ['Movie and series data comes from TMDB, game data from IGDB.com. We do not share any personal data with them.'] },
    ],
  },
  es: {
    title: 'Privacidad', updated: 'Actualizado', intro: 'Premiero recopila la menor cantidad de datos posible. Esto es exactamente lo que guardamos y por qué.',
    sections: [
      { h: 'Sin iniciar sesión', p: ['Tu lista “Quiero verla” y los servicios de streaming que elegiste se guardan solo en tu navegador. Nosotros no los vemos.'] },
      { h: 'Si inicias sesión con Google', p: ['Google nos da tu nombre, correo, foto de perfil e identificador de cuenta. Nunca vemos ni guardamos tu contraseña de Google.', 'Guardamos tu lista y tus servicios de streaming para que estén disponibles en todos tus dispositivos.'] },
      { h: 'Dónde se guardan los datos', p: ['El sitio funciona en Google Cloud y Cloudflare y los datos de las cuentas se guardan en una base de datos de Upstash. No vendemos tus datos ni los compartimos con otras empresas.'] },
      { h: 'Cookies', p: ['Al iniciar sesión usamos una cookie para recordar que entraste. Otra cookie recuerda tu idioma y país. No hay cookies publicitarias.', 'Contamos las visitas con Cloudflare Web Analytics, sin cookies y sin datos que permitan identificarte.'] },
      { h: 'Bot de Telegram', p: ['Si conectas el bot, guardamos el identificador de tu chat de Telegram, además del idioma y el país de tus avisos. Puedes desactivarlo en cualquier momento en “Mi lista” o con /stop en el bot.'] },
      { h: 'Correos', p: ['Los correos solo llegan si tú los activas en “Mi lista”. Los enviamos a la dirección de tu cuenta de Google a través del servicio Resend. Cada correo incluye un enlace para darte de baja.'] },
      { h: 'Avisos de errores', p: ['Cuando avisas de una fecha incorrecta o propones un estreno, guardamos tu mensaje, la dirección de la página y, si has iniciado sesión, tu correo, para poder comprobar la corrección.'] },
      { h: 'Cómo borrar tus datos', p: ['Abre “Mi lista”, despliega “Ajustes de la cuenta” al final de la página y elige “Eliminar cuenta”. Tu perfil, tu lista y tus suscripciones se borran al instante y para siempre.'] },
      { h: 'De dónde vienen los datos de estrenos', p: ['Los datos de películas y series vienen de TMDB y los de videojuegos de IGDB.com. No les damos ningún dato personal.'] },
    ],
  },
  fr: {
    title: 'Confidentialité', updated: 'Mis à jour', intro: 'Premiero collecte le moins de données possible. Voici exactement lesquelles et pourquoi.',
    sections: [
      { h: 'Sans connexion', p: ['Votre liste « Je veux voir » et les services de streaming choisis sont enregistrés uniquement dans votre navigateur. Nous ne les voyons pas.'] },
      { h: 'Si vous vous connectez avec Google', p: ['Google nous transmet votre nom, votre adresse e-mail, votre photo de profil et l’identifiant de votre compte. Nous ne voyons ni ne conservons jamais votre mot de passe Google.', 'Nous enregistrons votre liste et les services de streaming choisis pour qu’ils soient disponibles sur tous vos appareils.'] },
      { h: 'Où sont stockées les données', p: ['Le site est hébergé par Google Cloud et Cloudflare et les données des comptes sont stockées dans une base Upstash. Nous ne vendons pas vos données et ne les partageons avec aucune autre entreprise.'] },
      { h: 'Cookies', p: ['Après la connexion, nous déposons un cookie pour nous souvenir que vous êtes connecté. Un autre cookie mémorise votre langue et votre pays. Il n’y a aucun cookie publicitaire.', 'Nous comptons les visites avec Cloudflare Web Analytics, qui n’utilise ni cookies ni données permettant de vous identifier.'] },
      { h: 'Bot Telegram', p: ['Si vous connectez le bot, nous conservons l’identifiant de votre conversation Telegram, ainsi que la langue et le pays de vos rappels. Vous pouvez le désactiver à tout moment dans « Ma liste » ou avec /stop dans le bot.'] },
      { h: 'E-mails', p: ['Les e-mails n’arrivent que si vous les activez vous-même dans « Ma liste ». Nous les envoyons à l’adresse de votre compte Google via le service Resend. Chaque e-mail contient un lien de désinscription.'] },
      { h: 'Signalements d’erreurs', p: ['Lorsque vous signalez une date erronée ou proposez une sortie, nous conservons votre message, l’adresse de la page et, si vous êtes connecté, votre e-mail, afin de vérifier la correction.'] },
      { h: 'Comment supprimer vos données', p: ['Ouvrez « Ma liste », dépliez « Paramètres du compte » en bas de la page et choisissez « Supprimer le compte ». Votre profil, votre liste et vos abonnements sont supprimés immédiatement et définitivement.'] },
      { h: 'D’où viennent les données sur les sorties', p: ['Les données sur les films et les séries viennent de TMDB, celles sur les jeux d’IGDB.com. Nous ne leur transmettons aucune donnée personnelle.'] },
    ],
  },
  pl: {
    title: 'Prywatność', updated: 'Aktualizacja', intro: 'Premiero zbiera jak najmniej danych. Oto dokładnie jakie i po co.',
    sections: [
      { h: 'Bez logowania', p: ['Twoja lista „Chcę obejrzeć” i wybrane serwisy streamingowe są zapisane tylko w Twojej przeglądarce. Nie widzimy ich.'] },
      { h: 'Jeśli logujesz się przez Google', p: ['Google przekazuje nam Twoje imię, adres e-mail, zdjęcie profilowe i identyfikator konta. Nigdy nie widzimy ani nie przechowujemy hasła do Google.', 'Przechowujemy Twoją listę i wybrane serwisy, aby były dostępne na wszystkich Twoich urządzeniach.'] },
      { h: 'Gdzie są przechowywane dane', p: ['Strona działa na Google Cloud i Cloudflare, a dane kont są przechowywane w bazie Upstash. Nie sprzedajemy Twoich danych ani nie przekazujemy ich innym firmom.'] },
      { h: 'Pliki cookie', p: ['Po zalogowaniu ustawiamy jeden plik cookie, aby pamiętać, że jesteś zalogowany. Drugi zapamiętuje język i kraj. Nie ma reklamowych plików cookie.', 'Odwiedziny liczymy przez Cloudflare Web Analytics, bez plików cookie i bez danych, które pozwalają Cię rozpoznać.'] },
      { h: 'Bot w Telegramie', p: ['Jeśli połączysz bota, zapisujemy identyfikator Twojego czatu w Telegramie oraz język i kraj przypomnień. Możesz go wyłączyć w każdej chwili w „Mojej liście” lub poleceniem /stop w bocie.'] },
      { h: 'E-maile', p: ['Wiadomości przychodzą tylko wtedy, gdy sam je włączysz w „Mojej liście”. Wysyłamy je na adres Twojego konta Google przez usługę Resend. W każdej wiadomości jest link do wypisania się.'] },
      { h: 'Zgłoszenia błędów', p: ['Gdy zgłaszasz błędną datę lub proponujesz premierę, zapisujemy Twoją wiadomość, adres strony i — jeśli jesteś zalogowany — Twój e-mail, aby sprawdzić poprawkę.'] },
      { h: 'Jak usunąć dane', p: ['Otwórz „Moja lista”, na dole strony rozwiń „Ustawienia konta” i wybierz „Usuń konto”. Profil, lista i subskrypcje zostaną usunięte od razu i na zawsze.'] },
      { h: 'Skąd pochodzą dane o premierach', p: ['Dane o filmach i serialach pochodzą z TMDB, o grach z IGDB.com. Nie przekazujemy im żadnych danych osobowych.'] },
    ],
  },
  de: {
    title: 'Datenschutz', updated: 'Stand', intro: 'Premiero erhebt so wenig Daten wie möglich. Hier steht genau, welche und wofür.',
    sections: [
      { h: 'Ohne Anmeldung', p: ['Deine Liste „Will ich sehen“ und deine gewählten Streamingdienste werden nur in deinem Browser gespeichert. Wir sehen sie nicht.'] },
      { h: 'Wenn du dich mit Google anmeldest', p: ['Google übermittelt uns deinen Namen, deine E-Mail-Adresse, dein Profilbild und deine Konto-ID. Dein Google-Passwort sehen und speichern wir nie.', 'Wir speichern deine Liste und deine Streamingdienste, damit sie auf all deinen Geräten verfügbar sind.'] },
      { h: 'Wo die Daten gespeichert werden', p: ['Die Website läuft bei Google Cloud und Cloudflare, Kontodaten liegen in einer Upstash-Datenbank. Wir verkaufen deine Daten nicht und geben sie nicht an andere Unternehmen weiter.'] },
      { h: 'Cookies', p: ['Nach der Anmeldung setzen wir ein Cookie, damit du angemeldet bleibst. Ein weiteres Cookie merkt sich Sprache und Land. Werbe-Cookies gibt es nicht.', 'Besuche zählen wir mit Cloudflare Web Analytics, ohne Cookies und ohne Daten, mit denen man dich erkennen könnte.'] },
      { h: 'Telegram-Bot', p: ['Wenn du den Bot verbindest, speichern wir die ID deines Telegram-Chats sowie Sprache und Land deiner Erinnerungen. Du kannst ihn jederzeit in „Meine Liste“ oder mit /stop im Bot ausschalten.'] },
      { h: 'E-Mails', p: ['E-Mails kommen nur, wenn du sie selbst in „Meine Liste“ einschaltest. Wir senden sie über den Dienst Resend an die Adresse deines Google-Kontos. Jede E-Mail enthält einen Abmeldelink.'] },
      { h: 'Fehlermeldungen', p: ['Wenn du ein falsches Datum meldest oder einen Release vorschlägst, speichern wir deine Nachricht, die Adresse der Seite und – wenn du angemeldet bist – deine E-Mail, um die Korrektur zu prüfen.'] },
      { h: 'So löschst du deine Daten', p: ['Öffne „Meine Liste“, klappe unten „Kontoeinstellungen“ auf und wähle „Konto löschen“. Profil, Liste und Abos werden sofort und endgültig gelöscht.'] },
      { h: 'Woher die Release-Daten kommen', p: ['Film- und Seriendaten stammen von TMDB, Spieledaten von IGDB.com. Persönliche Daten geben wir an sie nicht weiter.'] },
    ],
  },
  ru: {
    title: 'Конфиденциальность', updated: 'Обновлено', intro: 'Premiero собирает как можно меньше данных. Вот что именно и зачем.',
    sections: [
      { h: 'Без входа', p: ['Ваш список «Хочу посмотреть» и выбранные стриминги хранятся только в вашем браузере. Мы их не видим.'] },
      { h: 'Если вы входите через Google', p: ['Google передаёт нам ваше имя, электронную почту, фото профиля и идентификатор аккаунта. Пароль от Google мы не видим и не храним.', 'Мы храним ваш список и выбранные стриминги, чтобы они были доступны на всех ваших устройствах.'] },
      { h: 'Где хранятся данные', p: ['Сайт работает на Google Cloud и Cloudflare, данные аккаунтов хранятся в базе Upstash. Мы не продаём и не передаём ваши данные другим компаниям.'] },
      { h: 'Cookie', p: ['После входа мы ставим одну cookie, чтобы помнить, что вы вошли. Ещё одна cookie запоминает выбранный язык и страну. Рекламных cookie нет.', 'Статистику посещений мы считаем через Cloudflare Web Analytics: без cookie и без данных, по которым можно узнать человека.'] },
      { h: 'Telegram-бот', p: ['Если вы подключите бота, мы храним идентификатор вашего чата в Telegram, а также язык и страну напоминаний. Отключить можно в любой момент в «Моём списке» или командой /stop в боте.'] },
      { h: 'Письма на почту', p: ['Письма приходят, только если вы сами включите их в «Моём списке». Мы отправляем их на адрес вашего аккаунта Google через сервис Resend. В каждом письме есть ссылка «Отписаться».'] },
      { h: 'Сообщения об ошибках', p: ['Когда вы сообщаете о неправильной дате или предлагаете релиз, мы храним ваше сообщение, адрес страницы и, если вы вошли, вашу почту — чтобы проверить исправление.'] },
      { h: 'Как удалить данные', p: ['Откройте «Мой список», внизу страницы раскройте «Настройки аккаунта» и нажмите «Удалить аккаунт». Профиль, список и подписки удалятся сразу и навсегда.'] },
      { h: 'Откуда данные о релизах', p: ['Данные о фильмах и сериалах даёт TMDB, об играх — IGDB.com. Личных данных мы им не передаём.'] },
    ],
  },
};
