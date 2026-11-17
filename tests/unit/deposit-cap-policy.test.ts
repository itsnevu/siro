import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { DepositCapPolicy, DirectDepositControls } from '../../src/components/app/DepositCapPolicy';
import { readDepositCapEnforced } from '../../src/lib/deposit-cap-policy';

function render(value: string | undefined, disabled = false) {
  const controls = createElement(DirectDepositControls, { disabled, onDeposit: () => {} });
  return renderToStaticMarkup(createElement(DepositCapPolicy, { enforced: readDepositCapEnforced(value) }, controls));
}
test('unset and false restore the deposit control with a visible capacity disclosure', () => {
  for (const value of [undefined, '', 'false']) {
    const html = render(value);
    expect(html).toContain('Capacity is not yet strategy-specific.');
    expect(html).toContain('Approve / deposit');
    expect(html).not.toContain('disabled=""');
  }
});
test('true preserves hold; false still respects wallet and amount readiness', () => {
  expect(render('true')).toContain('Deposit held');
  expect(render('true')).toContain('disabled=""');
  expect(render('false', true)).toContain('disabled=""');
});
test('invalid flag and missing provider fail closed', () => {
  expect(() => render('tru')).toThrow('DEPOSIT_CAP_ENFORCED');
  expect(() => renderToStaticMarkup(createElement(DirectDepositControls, { disabled: false, onDeposit: () => {} }))).toThrow('provider is missing');
});
