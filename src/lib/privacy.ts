import type { Lang } from './types';

/** Текст страницы «Конфиденциальность»: заголовок и разделы на каждом языке. */
export const PRIVACY_UPDATED = '2026-10-21';

type Section = { h: string; p: string[] };
export const PRIVACY: Record<Lang, { title: string; intro: string; updated: string; sections: Section[] }> = {
  uk: {
    title: 'Конфіденційність', updated: 'Оновлено', intro: 'Premiero збирає якомога менше даних. Ось що саме і навіщо.',
    sections: [
      { h: 'Без входу', p: ['Ваш список «Хочу подивитися» і вибрані стримінги зберігаються лише у вашому браузері. Ми їх не бачимо.'] },
      { h: 'Якщо ви входите через Google', p: ['Ми отримуємо від Google ваше ім’я, електронну пошту, фото профілю й ідентифікатор акаунта. Пароль від Google ми не бачимо і не зберігаємо.', 'Ми зберігаємо ваш список і вибрані стримінги, щоб вони були доступні на всіх ваших пристроях.'] },
      { h: 'Де зберігаються дані', p: ['Сайт працює на Vercel, дані акаунтів зберігаються в базі Upstash. Ми не продаємо й не передаємо ваші дані іншим компаніям.'] },
      { h: 'Cookie', p: ['Після входу ми ставимо одну cookie, щоб пам’ятати, що ви увійшли. Ще одна cookie запам’ятовує вибрану мову й країну. Рекламних cookie немає.', 'Статистику відвідувань ми рахуємо через Vercel Web Analytics: без cookie і без даних, за якими можна впізнати людину.'] },
      { h: 'Як видалити дані', p: ['У меню акаунта натисніть «Видалити акаунт». Профіль, список і підписки буде видалено одразу й назавжди.'] },
      { h: 'Звідки дані про релізи', p: ['Дані про фільми й серіали надає TMDB, про ігри — IGDB.com. Особистих даних ми їм не передаємо.'] },
    ],
  },
  en: {
    title: 'Privacy', updated: 'Updated', intro: 'Premiero collects as little data as possible. Here is exactly what and why.',
    sections: [
      { h: 'Without signing in', p: ['Your “Want to watch” list and chosen streaming services are stored only in your browser. We cannot see them.'] },
      { h: 'If you sign in with Google', p: ['Google gives us your name, email address, profile photo and account ID. We never see or store your Google password.', 'We store your list and chosen streaming services so they are available on all your devices.'] },
      { h: 'Where the data is stored', p: ['The site runs on Vercel and account data is stored in an Upstash database. We do not sell your data or share it with other companies.'] },
      { h: 'Cookies', p: ['After you sign in we set one cookie to remember that you are signed in. Another cookie remembers your language and country. There are no advertising cookies.', 'We count visits with Vercel Web Analytics, which uses no cookies and no data that could identify you.'] },
      { h: 'How to delete your data', p: ['Open the account menu and choose “Delete account”. Your profile, list and subscriptions are deleted immediately and permanently.'] },
      { h: 'Where release data comes from', p: ['Movie and series data comes from TMDB, game data from IGDB.com. We do not share any personal data with them.'] },
    ],
  },
  es: {
    title: 'Privacidad', updated: 'Actualizado', intro: 'Premiero recopila la menor cantidad de datos posible. Esto es exactamente lo que guardamos y por qué.',
    sections: [
      { h: 'Sin iniciar sesión', p: ['Tu lista “Quiero verla” y los servicios de streaming que elegiste se guardan solo en tu navegador. Nosotros no los vemos.'] },
      { h: 'Si inicias sesión con Google', p: ['Google nos da tu nombre, correo, foto de perfil e identificador de cuenta. Nunca vemos ni guardamos tu contraseña de Google.', 'Guardamos tu lista y tus servicios de streaming para que estén disponibles en todos tus dispositivos.'] },
      { h: 'Dónde se guardan los datos', p: ['El sitio funciona en Vercel y los datos de las cuentas se guardan en una base de datos de Upstash. No vendemos tus datos ni los compartimos con otras empresas.'] },
      { h: 'Cookies', p: ['Al iniciar sesión usamos una cookie para recordar que entraste. Otra cookie recuerda tu idioma y país. No hay cookies publicitarias.', 'Contamos las visitas con Vercel Web Analytics, sin cookies y sin datos que permitan identificarte.'] },
      { h: 'Cómo borrar tus datos', p: ['En el menú de tu cuenta elige “Eliminar cuenta”. Tu perfil, tu lista y tus suscripciones se borran al instante y para siempre.'] },
      { h: 'De dónde vienen los datos de estrenos', p: ['Los datos de películas y series vienen de TMDB y los de videojuegos de IGDB.com. No les damos ningún dato personal.'] },
    ],
  },
  pl: {
    title: 'Prywatność', updated: 'Aktualizacja', intro: 'Premiero zbiera jak najmniej danych. Oto dokładnie jakie i po co.',
    sections: [
      { h: 'Bez logowania', p: ['Twoja lista „Chcę obejrzeć” i wybrane serwisy streamingowe są zapisane tylko w Twojej przeglądarce. Nie widzimy ich.'] },
      { h: 'Jeśli logujesz się przez Google', p: ['Google przekazuje nam Twoje imię, adres e-mail, zdjęcie profilowe i identyfikator konta. Nigdy nie widzimy ani nie przechowujemy hasła do Google.', 'Przechowujemy Twoją listę i wybrane serwisy, aby były dostępne na wszystkich Twoich urządzeniach.'] },
      { h: 'Gdzie są przechowywane dane', p: ['Strona działa na Vercel, a dane kont są przechowywane w bazie Upstash. Nie sprzedajemy Twoich danych ani nie przekazujemy ich innym firmom.'] },
      { h: 'Pliki cookie', p: ['Po zalogowaniu ustawiamy jeden plik cookie, aby pamiętać, że jesteś zalogowany. Drugi zapamiętuje język i kraj. Nie ma reklamowych plików cookie.', 'Odwiedziny liczymy przez Vercel Web Analytics, bez plików cookie i bez danych, które pozwalają Cię rozpoznać.'] },
      { h: 'Jak usunąć dane', p: ['W menu konta wybierz „Usuń konto”. Profil, lista i subskrypcje zostaną usunięte od razu i na zawsze.'] },
      { h: 'Skąd pochodzą dane o premierach', p: ['Dane o filmach i serialach pochodzą z TMDB, o grach z IGDB.com. Nie przekazujemy im żadnych danych osobowych.'] },
    ],
  },
  de: {
    title: 'Datenschutz', updated: 'Stand', intro: 'Premiero erhebt so wenig Daten wie möglich. Hier steht genau, welche und wofür.',
    sections: [
      { h: 'Ohne Anmeldung', p: ['Deine Liste „Will ich sehen“ und deine gewählten Streamingdienste werden nur in deinem Browser gespeichert. Wir sehen sie nicht.'] },
      { h: 'Wenn du dich mit Google anmeldest', p: ['Google übermittelt uns deinen Namen, deine E-Mail-Adresse, dein Profilbild und deine Konto-ID. Dein Google-Passwort sehen und speichern wir nie.', 'Wir speichern deine Liste und deine Streamingdienste, damit sie auf all deinen Geräten verfügbar sind.'] },
      { h: 'Wo die Daten gespeichert werden', p: ['Die Website läuft bei Vercel, Kontodaten liegen in einer Upstash-Datenbank. Wir verkaufen deine Daten nicht und geben sie nicht an andere Unternehmen weiter.'] },
      { h: 'Cookies', p: ['Nach der Anmeldung setzen wir ein Cookie, damit du angemeldet bleibst. Ein weiteres Cookie merkt sich Sprache und Land. Werbe-Cookies gibt es nicht.', 'Besuche zählen wir mit Vercel Web Analytics, ohne Cookies und ohne Daten, mit denen man dich erkennen könnte.'] },
      { h: 'So löschst du deine Daten', p: ['Wähle im Kontomenü „Konto löschen“. Profil, Liste und Abos werden sofort und endgültig gelöscht.'] },
      { h: 'Woher die Release-Daten kommen', p: ['Film- und Seriendaten stammen von TMDB, Spieledaten von IGDB.com. Persönliche Daten geben wir an sie nicht weiter.'] },
    ],
  },
  ru: {
    title: 'Конфиденциальность', updated: 'Обновлено', intro: 'Premiero собирает как можно меньше данных. Вот что именно и зачем.',
    sections: [
      { h: 'Без входа', p: ['Ваш список «Хочу посмотреть» и выбранные стриминги хранятся только в вашем браузере. Мы их не видим.'] },
      { h: 'Если вы входите через Google', p: ['Google передаёт нам ваше имя, электронную почту, фото профиля и идентификатор аккаунта. Пароль от Google мы не видим и не храним.', 'Мы храним ваш список и выбранные стриминги, чтобы они были доступны на всех ваших устройствах.'] },
      { h: 'Где хранятся данные', p: ['Сайт работает на Vercel, данные аккаунтов хранятся в базе Upstash. Мы не продаём и не передаём ваши данные другим компаниям.'] },
      { h: 'Cookie', p: ['После входа мы ставим одну cookie, чтобы помнить, что вы вошли. Ещё одна cookie запоминает выбранный язык и страну. Рекламных cookie нет.', 'Статистику посещений мы считаем через Vercel Web Analytics: без cookie и без данных, по которым можно узнать человека.'] },
      { h: 'Как удалить данные', p: ['В меню аккаунта нажмите «Удалить аккаунт». Профиль, список и подписки удалятся сразу и навсегда.'] },
      { h: 'Откуда данные о релизах', p: ['Данные о фильмах и сериалах даёт TMDB, об играх — IGDB.com. Личных данных мы им не передаём.'] },
    ],
  },
};
