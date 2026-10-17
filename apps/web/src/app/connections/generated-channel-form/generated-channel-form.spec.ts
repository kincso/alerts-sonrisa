import { TestBed } from '@angular/core/testing';
import type { ChannelDescriptor } from '@alerts/shared';
import { applyServerErrors, buildChannelForm } from './channel-form';
import { GeneratedChannelForm } from './generated-channel-form';

// testing.md S1-9: a channel the app has never heard of still gets a working form
// (A12 "add channels later", DoD 9).
const FAKE_TEAMS: ChannelDescriptor = {
  type: 'teams',
  label: 'Microsoft Teams',
  fields: [
    { key: 'webhook', label: 'Teams webhook URL', type: 'url', required: true },
    { key: 'mention', label: 'Mention', type: 'text', required: false },
  ],
};

function render(form = buildChannelForm(FAKE_TEAMS.fields)) {
  const fixture = TestBed.createComponent(GeneratedChannelForm);
  fixture.componentRef.setInput('fields', FAKE_TEAMS.fields);
  fixture.componentRef.setInput('form', form);
  fixture.detectChanges();
  return { fixture, form, el: fixture.nativeElement as HTMLElement };
}

function inputLabelled(el: HTMLElement, text: string): HTMLInputElement {
  const label = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.includes(text));
  const input = label ? el.querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null;
  if (!input) throw new Error(`No input labelled "${text}"`);
  return input;
}

describe('GeneratedChannelForm', () => {
  it('renders one labelled input per field of an unknown channel', () => {
    const { el } = render();

    expect(inputLabelled(el, 'Teams webhook URL').type).toBe('url');
    expect(inputLabelled(el, 'Mention').type).toBe('text');
  });

  it('blocks an empty required field and shows a message once touched', async () => {
    const { fixture, form, el } = render();
    expect(form.invalid).toBe(true);

    form.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.textContent).toContain('Teams webhook URL is required.');

    const webhook = inputLabelled(el, 'Teams webhook URL');
    webhook.value = 'https://example.com/hook';
    webhook.dispatchEvent(new Event('input'));
    expect(form.valid).toBe(true);
    expect(form.getRawValue()).toEqual({ webhook: 'https://example.com/hook', mention: '' });
  });

  it('shows a server validate() error on the matching field', async () => {
    const form = buildChannelForm(FAKE_TEAMS.fields, { webhook: 'https://bad.example' });
    const { fixture, el } = render(form);

    const unmatched = applyServerErrors(form.controls, {
      webhook: 'Not a Teams webhook.',
      other: 'Something else.',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('Not a Teams webhook.');
    expect(unmatched).toEqual({ other: 'Something else.' });
  });
});
