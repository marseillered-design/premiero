import type { Lang } from './types';

/** Тексты страниц «О сайте» и «Контакты». {email} на странице становится ссылкой на адрес. */
export const CONTACT_EMAIL = 'hello@thepremiero.com';

type Page = { title: string; description: string; paragraphs: string[] };
export const ABOUT: Record<Lang, { about: Page; contact: Page }> = {
  uk: {
    about: {
      title: 'Про Premiero',
      description: 'Premiero: календар прем’єр кіно, серіалів та ігор із датами для вашої країни, трейлерами й нагадуваннями.',
      paragraphs: [
        'Premiero показує, що й коли виходить: фільми в кіно та онлайн, нові серії й сезони, ігри. Дати виходу залежать від країни, тому календар показує їх для вашої.',
        'Позначте те, що чекаєте, і сайт нагадає про вихід у Telegram або на пошту. Без входу список зберігається лише у вашому браузері, а вхід через Google потрібен, щоб він був на всіх пристроях.',
        'Сайт безкоштовний. Дані про фільми й серіали надає TMDB, про ігри — IGDB.com. Помітили неправильну дату? На сторінці релізу є кнопка, щоб повідомити про помилку.',
        'Команда Premiero',
      ],
    },
    contact: {
      title: 'Контакти Premiero',
      description: 'Знайшли помилку, маєте ідею чи хочете співпрацювати? Напишіть команді Premiero.',
      paragraphs: ['Знайшли помилку, маєте ідею чи хочете співпрацювати? Напишіть нам: {email}'],
    },
  },
  en: {
    about: {
      title: 'About Premiero',
      description: 'Premiero is a release calendar for movies, series and games, with dates for your country, trailers and reminders.',
      paragraphs: [
        'Premiero shows what comes out and when: movies in theaters and online, new episodes and seasons, and games. Release dates differ by country, so the calendar shows them for yours.',
        'Mark what you are waiting for and the site reminds you on Telegram or by email. Without signing in, your list stays only in your browser; signing in with Google keeps it on all your devices.',
        'The site is free. Movie and series data comes from TMDB, and game data from IGDB.com. Spotted a wrong date? Each release page has a button to report it.',
        'The Premiero team',
      ],
    },
    contact: {
      title: 'Contact Premiero',
      description: 'Found a mistake, have an idea or want to work together? Write to the Premiero team.',
      paragraphs: ['Found a mistake, have an idea or want to work together? Write to us: {email}'],
    },
  },
  es: {
    about: {
      title: 'Acerca de Premiero',
      description: 'Premiero es un calendario de estrenos de cine, series y videojuegos, con fechas para tu país, tráileres y recordatorios.',
      paragraphs: [
        'Premiero muestra qué sale y cuándo: películas en cines y en línea, nuevos episodios y temporadas, y videojuegos. Las fechas cambian según el país, así que el calendario muestra las del tuyo.',
        'Marca lo que estás esperando y el sitio te avisa por Telegram o por correo. Sin iniciar sesión, tu lista se queda solo en tu navegador; al entrar con Google la tienes en todos tus dispositivos.',
        'El sitio es gratuito. Los datos de películas y series proceden de TMDB, y los de videojuegos de IGDB.com. ¿Has visto una fecha incorrecta? Cada página de estreno tiene un botón para avisarnos.',
        'El equipo de Premiero',
      ],
    },
    contact: {
      title: 'Contactar con Premiero',
      description: '¿Has encontrado un error, tienes una idea o quieres colaborar? Escribe al equipo de Premiero.',
      paragraphs: ['¿Has encontrado un error, tienes una idea o quieres colaborar? Escríbenos: {email}'],
    },
  },
  fr: {
    about: {
      title: 'À propos de Premiero',
      description: 'Premiero est un calendrier des sorties de films, de séries et de jeux, avec les dates de votre pays, des bandes-annonces et des rappels.',
      paragraphs: [
        'Premiero montre ce qui sort et quand : films au cinéma et en ligne, nouveaux épisodes et saisons, jeux. Les dates varient selon le pays, le calendrier affiche donc celles du vôtre.',
        'Marquez ce que vous attendez et le site vous le rappelle sur Telegram ou par e-mail. Sans connexion, votre liste reste uniquement dans votre navigateur ; la connexion avec Google la garde sur tous vos appareils.',
        'Le site est gratuit. Les données sur les films et les séries viennent de TMDB, celles sur les jeux d’IGDB.com. Une date erronée ? Chaque page de sortie a un bouton pour nous le signaler.',
        'L’équipe Premiero',
      ],
    },
    contact: {
      title: 'Contacter Premiero',
      description: 'Une erreur, une idée ou une envie de collaborer ? Écrivez à l’équipe Premiero.',
      paragraphs: ['Une erreur, une idée ou une envie de collaborer ? Écrivez-nous : {email}'],
    },
  },
  pl: {
    about: {
      title: 'O Premiero',
      description: 'Premiero to kalendarz premier filmów, seriali i gier z datami dla Twojego kraju, zwiastunami i przypomnieniami.',
      paragraphs: [
        'Premiero pokazuje, co i kiedy wychodzi: filmy w kinach i online, nowe odcinki i sezony oraz gry. Daty premier zależą od kraju, dlatego kalendarz pokazuje je dla Twojego.',
        'Zaznacz to, na co czekasz, a serwis przypomni Ci o premierze na Telegramie lub e-mailem. Bez logowania lista zostaje tylko w Twojej przeglądarce; logowanie przez Google udostępnia ją na wszystkich urządzeniach.',
        'Serwis jest bezpłatny. Dane o filmach i serialach pochodzą z TMDB, a o grach z IGDB.com. Widzisz błędną datę? Na stronie każdej premiery jest przycisk, aby to zgłosić.',
        'Zespół Premiero',
      ],
    },
    contact: {
      title: 'Kontakt z Premiero',
      description: 'Znalazłeś błąd, masz pomysł lub chcesz współpracować? Napisz do zespołu Premiero.',
      paragraphs: ['Znalazłeś błąd, masz pomysł lub chcesz współpracować? Napisz do nas: {email}'],
    },
  },
  de: {
    about: {
      title: 'Über Premiero',
      description: 'Premiero ist ein Kalender für Film-, Serien- und Spielestarts mit Terminen für dein Land, Trailern und Erinnerungen.',
      paragraphs: [
        'Premiero zeigt, was wann erscheint: Filme im Kino und online, neue Folgen und Staffeln sowie Spiele. Die Termine unterscheiden sich je nach Land, deshalb zeigt der Kalender die für deins.',
        'Markiere, worauf du wartest, und die Seite erinnert dich per Telegram oder E-Mail. Ohne Anmeldung bleibt deine Liste nur in deinem Browser; mit der Google-Anmeldung hast du sie auf allen Geräten.',
        'Die Seite ist kostenlos. Film- und Seriendaten stammen von TMDB, Spieledaten von IGDB.com. Falsches Datum entdeckt? Auf jeder Release-Seite gibt es einen Button, um es zu melden.',
        'Das Premiero-Team',
      ],
    },
    contact: {
      title: 'Premiero kontaktieren',
      description: 'Einen Fehler gefunden, eine Idee oder Lust auf Zusammenarbeit? Schreib dem Premiero-Team.',
      paragraphs: ['Einen Fehler gefunden, eine Idee oder Lust auf Zusammenarbeit? Schreib uns: {email}'],
    },
  },
  ru: {
    about: {
      title: 'О Premiero',
      description: 'Premiero: календарь премьер кино, сериалов и игр с датами для вашей страны, трейлерами и напоминаниями.',
      paragraphs: [
        'Premiero показывает, что и когда выходит: фильмы в кино и онлайн, новые серии и сезоны, игры. Даты выхода зависят от страны, поэтому календарь показывает их для вашей.',
        'Отметьте то, что ждёте, и сайт напомнит о выходе в Telegram или на почту. Без входа список хранится только в вашем браузере, а вход через Google нужен, чтобы он был на всех устройствах.',
        'Сайт бесплатный. Данные о фильмах и сериалах предоставляет TMDB, об играх — IGDB.com. Заметили неправильную дату? На странице релиза есть кнопка, чтобы сообщить об ошибке.',
        'Команда Premiero',
      ],
    },
    contact: {
      title: 'Контакты Premiero',
      description: 'Нашли ошибку, хотите что-то предложить или обсудить сотрудничество? Напишите команде Premiero.',
      paragraphs: ['Нашли ошибку, хотите что-то предложить или обсудить сотрудничество? Напишите нам: {email}'],
    },
  },
};
