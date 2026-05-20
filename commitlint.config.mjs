/**
 * commitlint configuration for verifactu-sdk.
 *
 * Extends @commitlint/config-conventional (Conventional Commits) and pins the
 * scope vocabulary to the team's published module layout so a commit like
 * `feat(qr): add validator QR url` is accepted but `feat(random-thing): …`
 * is rejected. Keeping the list closed avoids drift; new scopes should be
 * added here in the same PR that introduces them.
 *
 * @see {@link https://www.conventionalcommits.org/ | Conventional Commits 1.0.0}
 */

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'ci',
        'docs',
        'release',
        'schemas',
        'types',
        'wire',
        'client',
        'soap',
        'xml',
        'hash',
        'signature',
        'qr',
        'cli',
        'validators',
        'errors',
        'examples',
        'deps',
      ],
    ],
  },
};
