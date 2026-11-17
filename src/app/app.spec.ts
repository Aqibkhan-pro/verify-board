import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';
const saveStudentRecord = vi.fn(async (input: object) => ({ ...input, id: '12_2026', percentage: 80 }));
const saveInstitute = vi.fn(async (name: string, id?: string) => ({ name, id: id ?? 'new-institute' }));
const deleteInstitute = vi.fn(async (_id: string) => {});

describe('App', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  function adminFixture() {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;
    vi.spyOn(app, 'recordsApi').mockResolvedValue({
      saveStudentRecord, saveInstitute, deleteInstitute,
      listStudentRecords: async () => [], listInstitutes: async () => []
    });
    app.adminPage.set(true);
    app.signedInEmail.set('admin@example.com');
    app.adminAuthorized.set(true);
    app.institutes.set([{ id: 'institute-1', name: 'Technical College' }]);
    fixture.detectChanges();
    // jsdom does not implement the browser dialog methods.
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    return { fixture, app, element: fixture.nativeElement as HTMLElement };
  }

  it('saves a student with or without an affiliated institute', async () => {
    const { fixture, app, element } = adminFixture();
    const form = element.querySelector('select[name="instituteId"]')!.closest('form')!;
    for (const selected of ['', 'institute-1']) {
      app.institutes.set([{ id: 'institute-1', name: 'Technical College' }]);
      app.selectedInstituteId.set(selected);
      for (const [name, value] of Object.entries({ rollNo: '12', passingYear: '2026', name: 'Student', programme: 'Electrical', totalMarks: '100', obtainedMarks: '80' })) {
        (form.elements.namedItem(name) as HTMLInputElement).value = value;
      }
      await app.saveStudent({ preventDefault() {}, currentTarget: form });
      expect(saveStudentRecord).toHaveBeenLastCalledWith(expect.objectContaining({ instituteId: selected, instituteName: selected ? 'Technical College' : '' }));
    }
    fixture.destroy();
  });

  it('preserves a deleted institute when editing an existing student', async () => {
    const { fixture, app, element } = adminFixture();
    app.editingRecord.set({ id: '12_2026', instituteId: 'deleted', instituteName: 'Former College' });
    app.selectedInstituteId.set('deleted');
    fixture.detectChanges();
    await fixture.whenStable();
    const select = element.querySelector('select[name="instituteId"]') as HTMLSelectElement;
    expect(select.value).toBe('deleted');
    expect(select.selectedOptions[0].textContent).toContain('Former College');
    app.cancelEdit();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(select.value).toBe('');
    fixture.destroy();
  });

  it('adds, updates and deletes institutes', async () => {
    const { fixture, app, element } = adminFixture();
    app.adminInstitutesView.set(true);
    fixture.detectChanges();
    const form = element.querySelector('.institute-form') as HTMLFormElement;
    const input = form.elements.namedItem('instituteName') as HTMLInputElement;
    input.value = 'New College';
    await app.saveAffiliatedInstitute({ preventDefault() {}, currentTarget: form });
    expect(saveInstitute).toHaveBeenLastCalledWith('New College', undefined);
    app.editInstitute({ id: 'new-institute', name: 'New College' });
    input.value = 'Updated College';
    await app.saveAffiliatedInstitute({ preventDefault() {}, currentTarget: form });
    expect(saveInstitute).toHaveBeenLastCalledWith('Updated College', 'new-institute');
    await app.removeInstitute({ id: 'new-institute', name: 'Updated College' });
    expect(element.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(deleteInstitute).not.toHaveBeenCalled();
    await app.confirmDelete();
    expect(element.querySelector('dialog')?.hasAttribute('open')).toBe(false);
    expect(deleteInstitute).toHaveBeenCalledWith('new-institute');
    expect(app.institutes().some((item: { id: string }) => item.id === 'new-institute')).toBe(false);
    fixture.destroy();
  });

  it('shows institutes on a separate admin page with search', () => {
    const { fixture, app, element } = adminFixture();
    expect(element.querySelector('.institute-form')).toBeNull();
    const tab = Array.from(element.querySelectorAll<HTMLAnchorElement>('.admin-tabs a'))
      .find(link => link.textContent?.includes('Affiliated institutes'))!;
    tab.click();
    app.institutes.set([
      { id: 'a', name: 'Alpha Technical Institute' },
      { id: 'b', name: 'Beta Polytechnic College' }
    ]);
    fixture.detectChanges();
    expect(element.querySelector('.institute-form')).toBeTruthy();
    expect(element.querySelector('select[name="instituteId"]')).toBeNull();
    const names = () => Array.from(element.querySelectorAll('.institute-manager .record-list-item strong')).map(item => item.textContent);
    expect(names()).toEqual(['Alpha Technical Institute', 'Beta Polytechnic College']);
    app.adminInstituteSearch.set('POLY');
    fixture.detectChanges();
    expect(names()).toEqual(['Beta Polytechnic College']);
    app.adminInstituteSearch.set('missing');
    fixture.detectChanges();
    expect(element.querySelector('.institute-manager')?.textContent).toContain('No institutes match');
    window.location.hash = '';
    fixture.destroy();
  });

  it('cancels institute deletion without deleting data', () => {
    const { fixture, app } = adminFixture();
    app.removeInstitute({ id: 'institute-1', name: 'Technical College' });
    app.cancelDelete();
    expect(app.pendingDelete()).toBeNull();
    expect(deleteInstitute).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('opens the affiliated institutes page from the navbar and lists institutes', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;
    const listInstitutes = vi.fn(async () => [
      { id: 'a', name: 'Alpha Technical Institute' },
      { id: 'b', name: 'Beta Polytechnic College' }
    ]);
    vi.spyOn(app, 'recordsApi').mockResolvedValue({ listInstitutes });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const navLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('.main-nav a'))
      .find(link => link.textContent?.trim() === 'Affiliated Institutes')!;
    expect(navLink).toBeTruthy();
    navLink.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(listInstitutes).toHaveBeenCalled();
    expect(element.querySelector('h1')?.textContent).toContain('Affiliated');
    const items = Array.from(element.querySelectorAll('.institute-list li')).map(item => item.textContent?.trim());
    expect(items).toEqual(['1Alpha Technical Institute', '2Beta Polytechnic College']);
    app.instituteSearch.set('beta');
    fixture.detectChanges();
    expect(element.querySelectorAll('.institute-list li').length).toBe(1);
    window.location.hash = '';
    fixture.destroy();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Vocational and Technical Skills Council homepage heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Vocational and Technical Skills Council');
  });
});
