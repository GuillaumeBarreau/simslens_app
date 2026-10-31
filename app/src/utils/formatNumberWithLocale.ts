export const formatNumberWithLocale = (num: number, locale: string = 'fr-FR', options = {}) => {
  const formater = new Intl.NumberFormat(locale, options).format(num);
  return formater;
};
