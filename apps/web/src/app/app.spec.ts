import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App (S0 scaffold check)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('renders the shared severities and the API health result', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    const el = fixture.nativeElement as HTMLElement;

    http.expectOne('/api/health').flush({ status: 'ok', severities: ['low', 'medium', 'high'] });
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="web-severities"]')?.textContent).toBe(
      'low, medium, high',
    );
    expect(el.querySelector('[data-testid="api-status"]')?.textContent).toContain('ok');
    http.verify();
  });

  it('shows an error when the API is unreachable', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/health').error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
  });
});
