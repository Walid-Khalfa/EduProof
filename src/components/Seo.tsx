import React from 'react';
import { Helmet } from 'react-helmet-async';

type SeoProps = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
};

export default function Seo({
  title = 'EduProof — Smart learning. Verified.',
  description = 'Mint and verify blockchain-backed academic certificates with AI OCR, IPFS and Ethereum.',
  image = '/brand/og/eduproof-og.png',
  url,
}: SeoProps) {
  const fullImageUrl = image.startsWith('http') 
    ? image 
    : `${window.location.origin}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content="EduProof" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}
