/**
 * VitePress configuration for the verifactu-sdk documentation site.
 *
 * The site is published at https://eloi24.github.io/verifactu-sdk/ by
 * the `docs.yml` GitHub Action. English is the source-of-truth locale (served
 * at the root) and is mirrored into Spanish, Catalan and Galician.
 * Basque (Euskara) support is planned for a future release.
 * The TypeDoc-generated API reference under `docs/api/` is included in the
 * English sidebar only — the identifiers are English by project convention.
 *
 * @module
 */

import { type DefaultTheme, defineConfig } from 'vitepress';

const repoUrl = 'https://github.com/eloi24/verifactu-sdk';
const editLinkBase = `${repoUrl}/edit/main/docs/:path`;

/**
 * Per-locale guide sidebar shared across every language.
 *
 * The filenames are identical in every locale, so the same sidebar tree can
 * be reused — only the labels and link prefixes are localised.
 */
function guideSidebar(
  linkPrefix: string,
  labels: Record<string, string>,
): DefaultTheme.SidebarItem[] {
  return [
    {
      text: labels.gettingStarted,
      items: [
        { text: labels.installation, link: `${linkPrefix}/guide/installation` },
        { text: labels.quickstart, link: `${linkPrefix}/guide/quickstart` },
        { text: labels.certificates, link: `${linkPrefix}/guide/certificates` },
      ],
    },
    {
      text: labels.concepts,
      items: [
        { text: labels.verifactuVsOnRequest, link: `${linkPrefix}/guide/verifactu-vs-on-request` },
        { text: labels.hashChain, link: `${linkPrefix}/guide/hash-chain` },
        { text: labels.qrCode, link: `${linkPrefix}/guide/qr-code` },
        { text: labels.flowControl, link: `${linkPrefix}/guide/flow-control` },
      ],
    },
    {
      text: labels.reference,
      items: [
        { text: labels.validations, link: `${linkPrefix}/guide/validations` },
        { text: labels.errorCodes, link: `${linkPrefix}/guide/error-codes` },
        { text: labels.cli, link: `${linkPrefix}/guide/cli` },
        { text: labels.testing, link: `${linkPrefix}/guide/testing` },
      ],
    },
  ];
}

/** English sidebar — also carries the API-reference section because TypeDoc only emits English. */
const enSidebar: DefaultTheme.Sidebar = {
  '/guide/': [
    ...guideSidebar('', {
      gettingStarted: 'Getting started',
      concepts: 'Concepts',
      reference: 'Reference',
      installation: 'Installation',
      quickstart: 'Quickstart',
      certificates: 'Certificates',
      verifactuVsOnRequest: 'VERI*FACTU vs on-request',
      hashChain: 'Hash chain',
      qrCode: 'QR code',
      flowControl: 'Flow control',
      validations: 'Validations',
      errorCodes: 'Error codes',
      cli: 'CLI',
      testing: 'Testing',
    }),
  ],
  '/examples/': [
    {
      text: 'Examples',
      items: [
        { text: 'Basic registration', link: '/examples/basic-alta' },
        { text: 'Batch of 1 000', link: '/examples/batch-1000' },
        { text: 'Paginated query', link: '/examples/consulta-paginada' },
        { text: 'On-request signed', link: '/examples/no-verifactu-firmado' },
      ],
    },
  ],
  '/api/': [
    {
      text: 'API reference',
      link: '/api/',
    },
  ],
};

const esSidebar: DefaultTheme.Sidebar = {
  '/es/guide/': guideSidebar('/es', {
    gettingStarted: 'Primeros pasos',
    concepts: 'Conceptos',
    reference: 'Referencia',
    installation: 'Instalación',
    quickstart: 'Inicio rápido',
    certificates: 'Certificados',
    verifactuVsOnRequest: 'VERI*FACTU vs. requerimiento',
    hashChain: 'Cadena de huellas',
    qrCode: 'Código QR',
    flowControl: 'Control de flujo',
    validations: 'Validaciones',
    errorCodes: 'Códigos de error',
    cli: 'CLI',
    testing: 'Pruebas',
  }),
  '/es/examples/': [
    {
      text: 'Ejemplos',
      items: [
        { text: 'Alta básica', link: '/es/examples/basic-alta' },
        { text: 'Envío de 1 000', link: '/es/examples/batch-1000' },
        { text: 'Consulta paginada', link: '/es/examples/consulta-paginada' },
        { text: 'Firmado bajo requerimiento', link: '/es/examples/no-verifactu-firmado' },
      ],
    },
  ],
};

const caSidebar: DefaultTheme.Sidebar = {
  '/ca/guide/': guideSidebar('/ca', {
    gettingStarted: 'Primers passos',
    concepts: 'Conceptes',
    reference: 'Referència',
    installation: 'Instal·lació',
    quickstart: 'Inici ràpid',
    certificates: 'Certificats',
    verifactuVsOnRequest: 'VERI*FACTU vs. requeriment',
    hashChain: 'Cadena d’empremtes',
    qrCode: 'Codi QR',
    flowControl: 'Control de flux',
    validations: 'Validacions',
    errorCodes: 'Codis d’error',
    cli: 'CLI',
    testing: 'Proves',
  }),
  '/ca/examples/': [
    {
      text: 'Exemples',
      items: [
        { text: 'Alta bàsica', link: '/ca/examples/basic-alta' },
        { text: 'Enviament de 1 000', link: '/ca/examples/batch-1000' },
        { text: 'Consulta paginada', link: '/ca/examples/consulta-paginada' },
        { text: 'Signat per requeriment', link: '/ca/examples/no-verifactu-firmado' },
      ],
    },
  ],
};

const glSidebar: DefaultTheme.Sidebar = {
  '/gl/guide/': guideSidebar('/gl', {
    gettingStarted: 'Primeiros pasos',
    concepts: 'Conceptos',
    reference: 'Referencia',
    installation: 'Instalación',
    quickstart: 'Inicio rápido',
    certificates: 'Certificados',
    verifactuVsOnRequest: 'VERI*FACTU vs. requirimento',
    hashChain: 'Cadea de pegadas',
    qrCode: 'Código QR',
    flowControl: 'Control de fluxo',
    validations: 'Validacións',
    errorCodes: 'Códigos de erro',
    cli: 'CLI',
    testing: 'Probas',
  }),
  '/gl/examples/': [
    {
      text: 'Exemplos',
      items: [
        { text: 'Alta básica', link: '/gl/examples/basic-alta' },
        { text: 'Envío de 1 000', link: '/gl/examples/batch-1000' },
        { text: 'Consulta paxinada', link: '/gl/examples/consulta-paginada' },
        { text: 'Asinado por requirimento', link: '/gl/examples/no-verifactu-firmado' },
      ],
    },
  ],
};

export default defineConfig({
  title: 'verifactu-sdk',
  description:
    'TypeScript SDK for the Spanish AEAT VERI*FACTU electronic-invoicing system (RD 1007/2023, Order HAC/1177/2024).',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: 'localhostLinks',
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#e11d48' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repoUrl }],
    editLink: {
      pattern: editLinkBase,
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the LGPL-3.0-or-later license.',
      copyright: 'Copyright © 2026 Acme Software SL',
    },
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      link: '/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/installation' },
          { text: 'API', link: '/api/' },
          { text: 'Examples', link: '/examples/basic-alta' },
        ],
        sidebar: enSidebar,
      },
    },
    es: {
      label: 'Español',
      lang: 'es',
      link: '/es/',
      themeConfig: {
        nav: [
          { text: 'Inicio', link: '/es/' },
          { text: 'Guía', link: '/es/guide/installation' },
          { text: 'API', link: '/api/' },
          { text: 'Ejemplos', link: '/es/examples/basic-alta' },
        ],
        sidebar: esSidebar,
      },
    },
    ca: {
      label: 'Català',
      lang: 'ca',
      link: '/ca/',
      themeConfig: {
        nav: [
          { text: 'Inici', link: '/ca/' },
          { text: 'Guia', link: '/ca/guide/installation' },
          { text: 'API', link: '/api/' },
          { text: 'Exemples', link: '/ca/examples/basic-alta' },
        ],
        sidebar: caSidebar,
      },
    },
    gl: {
      label: 'Galego',
      lang: 'gl',
      link: '/gl/',
      themeConfig: {
        nav: [
          { text: 'Inicio', link: '/gl/' },
          { text: 'Guía', link: '/gl/guide/installation' },
          { text: 'API', link: '/api/' },
          { text: 'Exemplos', link: '/gl/examples/basic-alta' },
        ],
        sidebar: glSidebar,
      },
    },
  },
});
