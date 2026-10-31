import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { OG_IMAGE_EN_PATH, OG_IMAGE_PATH, SITE_NAME, SITE_URL } from '../../../../config/site';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  type?: string;
  src?: string;
  /** Chemin canonique de la page (ex. `/`). Par défaut : le chemin courant. */
  path?: string;
  /** Données structurées schema.org injectées en JSON-LD */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Empêche l'indexation (pages privées / applicatives) */
  noindex?: boolean;
}

const absoluteUrl = (value: string) => (value.startsWith('http') ? value : `${SITE_URL}${value}`);

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  type = 'website',
  src,
  path,
  jsonLd,
  noindex = false,
}) => {
  const { t, i18n } = useTranslation('metadata');

  const metaTitle = title || t('seo.title');
  const metaDescription = description || t('seo.description');
  const metaKeywords = keywords || t('seo.keywords');
  const ogTitle = title || t('seo.ogTitle');
  const ogDescription = description || t('seo.ogDescription');
  const lang = i18n.language?.split('-')[0] === 'fr' ? 'fr' : 'en';
  const ogLocale = lang === 'fr' ? 'fr_FR' : 'en_US';
  const defaultOgImage = lang === 'fr' ? OG_IMAGE_PATH : OG_IMAGE_EN_PATH;
  const ogImage = absoluteUrl(src || defaultOgImage);
  const canonical = `${SITE_URL}${path ?? (typeof window !== 'undefined' ? window.location.pathname : '/')}`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex, nofollow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      {!src && <meta property="og:image:type" content="image/jpeg" />}
      {!src && <meta property="og:image:width" content="1200" />}
      {!src && <meta property="og:image:height" content="630" />}
      <meta property="og:image:alt" content={ogTitle} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={lang === 'fr' ? 'en_US' : 'fr_FR'} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogTitle} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export default SEO;
