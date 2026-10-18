/** Выбор темы посетителя ('light' | 'dark'); без него сайт следует системе. */
export const THEME_KEY = 'premiero.theme';

/** Выполняется в <head> до отрисовки, чтобы сохранённая тема не мигала при загрузке. */
export const THEME_INIT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
