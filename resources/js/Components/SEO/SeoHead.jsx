import React from 'react';
import { Head } from '@inertiajs/react';

export default function SeoHead({ seo = {} }) {
  if (!seo?.title) return null;

  return (
    <Head>
      <title>{seo.full_title || seo.title}</title>
      <meta head-key="description" name="description" content={seo.description} />
      <meta head-key="robots" name="robots" content={seo.robots || 'noindex, nofollow'} />
      <link head-key="canonical" rel="canonical" href={seo.canonical} />

      <meta head-key="og:type" property="og:type" content={seo.type || 'website'} />
      <meta head-key="og:title" property="og:title" content={seo.full_title || seo.title} />
      <meta head-key="og:description" property="og:description" content={seo.description} />
      <meta head-key="og:url" property="og:url" content={seo.canonical} />
      <meta head-key="og:site_name" property="og:site_name" content={seo.site_name} />
      {seo.image && <meta head-key="og:image" property="og:image" content={seo.image} />}

      <meta head-key="twitter:card" name="twitter:card" content={seo.image ? 'summary_large_image' : 'summary'} />
      <meta head-key="twitter:title" name="twitter:title" content={seo.full_title || seo.title} />
      <meta head-key="twitter:description" name="twitter:description" content={seo.description} />
      {seo.image && <meta head-key="twitter:image" name="twitter:image" content={seo.image} />}

      {seo.google_site_verification && (
        <meta
          head-key="google-site-verification"
          name="google-site-verification"
          content={seo.google_site_verification}
        />
      )}

      {(seo.structured_data || []).map((schema, index) => (
        <script
          head-key={`structured-data-${index}`}
          key={`structured-data-${index}`}
          type="application/ld+json"
        >
          {JSON.stringify(schema)}
        </script>
      ))}
    </Head>
  );
}
