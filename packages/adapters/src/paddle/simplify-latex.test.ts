import { describe, expect, test } from 'bun:test';
import { simplifyLatex, simplifyMarkdownArtifacts, simplifyTableHtml } from './simplify-latex';

describe('simplifyLatex', () => {
  test('flattens the observed OCR asterisk with natural spacing', () => {
    expect(simplifyLatex('Card Purchase U R $ ^{{*}} $ Magicjack')).toBe(
      'Card Purchase U R* Magicjack'
    );
  });

  test('uses natural spacing around typographic symbols', () => {
    expect(simplifyLatex('See $ \\S $ 12')).toBe('See § 12');
    expect(simplifyLatex('Plus/minus $ \\pm $ two')).toBe('Plus/minus ± two');
  });

  test('preserves legitimate formulas and variable scripts', () => {
    for (const text of [
      'Energy $E = mc^2$ scales',
      'Integral $\\int_0^1 f(x)\\,dx$',
      'Fraction $\\frac{1}{2}$',
      'Variable $^{x}$ remains',
      'Index $_{i}$ remains',
      'Star $^{*}$ remains',
    ]) {
      expect(simplifyLatex(text)).toBe(text);
    }
  });

  test('flattens only explicitly mapped numeric and sign scripts', () => {
    expect(simplifyLatex('Area m $^{2}$ total')).toBe('Area m² total');
    expect(simplifyLatex('Value x $_{1}$ next')).toBe('Value x₁ next');
    expect(simplifyLatex('Charge $^{+}$ state')).toBe('Charge⁺ state');
  });

  test('preserves currency and escaped punctuation', () => {
    expect(simplifyLatex('Paid $20.91 and $15.33')).toBe('Paid $20.91 and $15.33');
    expect(simplifyLatex('Literal $ \\& $amp; and $ \\& $quot;')).toBe(
      'Literal $ \\& $amp; and $ \\& $quot;'
    );
  });
});

describe('simplifyTableHtml', () => {
  test('normalizes text nodes only', () => {
    const html =
      '<table data-label="$ \\S $" title="value > $ ^{{*}} $"><!-- > $ \\S $ --><tr><td><a href="https://example.test/$%20^{{*}}%20$">See $ \\S $ 12</a></td><td>U R $ ^{{*}} $ Magicjack</td></tr></table>';
    expect(simplifyTableHtml(html)).toBe(
      '<table data-label="$ \\S $" title="value > $ ^{{*}} $"><!-- > $ \\S $ --><tr><td><a href="https://example.test/$%20^{{*}}%20$">See § 12</a></td><td>U R* Magicjack</td></tr></table>'
    );
  });

  test('preserves formulas and prevents entity synthesis', () => {
    const html = '<table><tr><td>$\\frac{a}{b}$</td><td>$ \\& $amp; $ \\& $quot;</td></tr></table>';
    expect(simplifyTableHtml(html)).toBe(html);
  });

  test('does not treat non-HTML content as table markup', () => {
    const plain = 'U R $ ^{{*}} $ row';
    expect(simplifyTableHtml(plain)).toBe(plain);
  });
});

describe('simplifyMarkdownArtifacts', () => {
  test('normalizes visible prose and later table text without touching markup', () => {
    const markdown =
      'See $ \\S $ 12 and U R $ ^{{*}} $ Magicjack.\n\n<table title="$ ^{{*}} $"><tr><td>Visible $ \\S $ 7</td></tr></table>';
    expect(simplifyMarkdownArtifacts(markdown)).toBe(
      'See § 12 and U R* Magicjack.\n\n<table title="$ ^{{*}} $"><tr><td>Visible § 7</td></tr></table>'
    );
  });

  test('protects link and image destinations while normalizing visible labels', () => {
    const markdown =
      '[See $ \\S $ 12](https://example.test/$ ^{{*}} $/doc) ![U R $ ^{{*}} $ logo](imgs/$ ^{{*}} $.jpg)';
    expect(simplifyMarkdownArtifacts(markdown)).toBe(
      '[See § 12](https://example.test/$ ^{{*}} $/doc) ![U R* logo](imgs/$ ^{{*}} $.jpg)'
    );
  });

  test('preserves HTML comments and attributes after visible prose', () => {
    const markdown =
      'U R $ ^{{*}} $ text <!-- $ \\S $ --> <span data-x="$ ^{{*}} $">See $ \\S $ 2</span>';
    expect(simplifyMarkdownArtifacts(markdown)).toBe(
      'U R* text <!-- $ \\S $ --> <span data-x="$ ^{{*}} $">See § 2</span>'
    );
  });
});
