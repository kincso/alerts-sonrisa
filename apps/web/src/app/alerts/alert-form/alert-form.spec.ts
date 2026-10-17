import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestKey, type HarnessLoader } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatChipInputHarness } from '@angular/material/chips/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import type { AlertInput, ChannelConnection, SourceSummary } from '@alerts/shared';
import { AlertForm } from './alert-form';

// testing.md S3-15
const SOURCES: SourceSummary[] = [
  { id: 'bbc', label: 'BBC World News', enabled: true, fixedSeverity: 'medium' },
  { id: 'usgs', label: 'USGS earthquakes', enabled: true },
];
const CONNECTIONS: ChannelConnection[] = [
  { id: 'c1', type: 'email', label: 'Work inbox', config: {}, createdAt: '' },
  { id: 'c2', type: 'slack', label: '#alerts', config: {}, createdAt: '' },
];

describe('AlertForm', () => {
  let loader: HarnessLoader;
  let el: HTMLElement;
  let saved: AlertInput[];
  let fixture: ReturnType<typeof TestBed.createComponent<AlertForm>>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertForm);
    fixture.componentRef.setInput('sources', SOURCES);
    fixture.componentRef.setInput('connections', CONNECTIONS);
    saved = [];
    fixture.componentInstance.save.subscribe((input) => saved.push(input));
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  /** Controls are found by their visible label, as the user finds them. */
  const field = (label: string) =>
    loader.getHarness(MatFormFieldHarness.with({ floatingLabelText: label }));

  async function select(label: string): Promise<MatSelectHarness> {
    const found = await (await field(label)).getControl(MatSelectHarness);
    if (!found) throw new Error(`No select labelled "${label}"`);
    return found;
  }

  async function textInput(label: string): Promise<MatInputHarness> {
    const found = await (await field(label)).getControl(MatInputHarness);
    if (!found) throw new Error(`No input labelled "${label}"`);
    return found;
  }

  const saveButton = () => loader.getHarness(MatButtonHarness.with({ text: 'Save alert' }));

  it('shows the required errors and does not save an empty form', async () => {
    await (await saveButton()).click();

    expect(saved).toEqual([]);
    expect(el.textContent).toContain('Name is required.');
    expect(el.textContent).toContain('Choose a source.');
    expect(el.textContent).toContain('Choose at least one connection.');
  });

  it('emits the alert input once every required field is filled', async () => {
    await (await textInput('Name')).setValue('Quakes');
    await (await select('Source')).clickOptions({ text: 'USGS earthquakes' });
    const keywords = await loader.getHarness(MatChipInputHarness);
    await keywords.setValue('Peru');
    await keywords.sendSeparatorKey(TestKey.ENTER);
    await (await select('Minimum severity')).clickOptions({ text: 'High' });
    const sendTo = await select('Send to');
    await sendTo.open();
    await sendTo.clickOptions({ text: '#alerts' });
    await sendTo.close();

    await (await saveButton()).click();

    expect(saved).toEqual([
      {
        name: 'Quakes',
        sourceId: 'usgs',
        keywords: ['Peru'],
        minSeverity: 'high',
        connectionIds: ['c2'],
      },
    ]);
  });

  it('explains a source with a fixed severity (D1)', async () => {
    await (await select('Source')).clickOptions({ text: 'BBC World News' });
    expect(el.textContent).toContain('Items from BBC World News are always medium.');

    await (await select('Minimum severity')).clickOptions({ text: 'High' });
    expect(el.textContent).toContain('always medium, so this alert will never match.');
  });

  it('shows a server field error on its field', async () => {
    fixture.componentRef.setInput('serverErrors', {
      connectionIds: 'Choose connections from your list.',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('Choose connections from your list.');
  });
});
