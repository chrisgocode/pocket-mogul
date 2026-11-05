import { spawnSync } from 'node:child_process';
import path from 'node:path';

type Diagnostic = { code: string; filename: string };

const FIXTURES = 'lint-rules/fixtures';

const fixtureName = (filename: string) =>
  filename.slice(filename.indexOf(FIXTURES) + FIXTURES.length + 1);

function lintFixtures(): Map<string, string[]> {
  const { stdout } = spawnSync(
    path.join('node_modules', '.bin', 'oxlint'),
    ['--format', 'json', FIXTURES],
    { encoding: 'utf8' },
  );
  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
  const byFile = Map.groupBy(diagnostics, (diagnostic) => fixtureName(diagnostic.filename));
  return new Map(
    [...byFile].map(([file, found]) => [file, found.map((diagnostic) => diagnostic.code)]),
  );
}

const rulesByFile = lintFixtures();

const EXPECTED: [fixture: string, rule: string][] = [
  ['src/features/commented.ts', 'pocket-mogul(no-comments)'],
  ['src/domain/readsTheClock.ts', 'pocket-mogul(no-nondeterminism)'],
  ['src/features/UsesEffect.tsx', 'eslint(no-restricted-imports)'],
  ['src/features/UsesState.tsx', 'eslint(no-restricted-imports)'],
  ['src/domain/importsReact.ts', 'eslint(no-restricted-imports)'],
  ['src/ui/importsAFeature.ts', 'eslint(no-restricted-imports)'],
  ['src/features/magicNumber.ts', 'eslint(no-magic-numbers)'],
  ['src/features/tooLong.ts', 'eslint(max-lines-per-function)'],
  ['src/features/tangled.ts', 'eslint(max-depth)'],
  ['src/features/tangled.ts', 'eslint(max-params)'],
  ['src/domain/snapshot.test.ts', 'jest(no-restricted-matchers)'],
  ['src/domain/snapshot.test.ts', 'jest(no-focused-tests)'],
];

describe('quality gates', () => {
  it.each(EXPECTED)('%s breaks %s', (fixture, rule) => {
    expect(rulesByFile.get(fixture)).toContain(rule);
  });

  it('allows component state inside src/ui/state', () => {
    expect(rulesByFile.has('src/ui/state/useAllowedToggle.ts')).toBe(false);
  });
});
