import { Component, computed, signal } from '@angular/core';
import type { StudentRecord, StudentRecordInput } from './student-records';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html'
})
export class App {
  protected readonly menuOpen = signal(false);
  protected readonly verificationPage = signal(window.location.hash === '#verification');
  protected readonly resultPage = signal(window.location.hash === '#result');
  protected readonly adminPage = signal(window.location.hash === '#admin');
  protected readonly verificationStatus = signal('');
  protected readonly activeRecord = signal<StudentRecord | null>(null);
  protected readonly searchBusy = signal(false);
  protected readonly authBusy = signal(false);
  protected readonly authStatus = signal('');
  protected readonly signedInEmail = signal('');
  protected readonly adminAuthorized = signal(false);
  protected readonly students = signal<StudentRecord[]>([]);
  protected readonly studentsLoading = signal(false);
  protected readonly recordBusy = signal(false);
  protected readonly recordStatus = signal('');
  protected readonly editingRecord = signal<StudentRecord | null>(null);
  protected readonly verificationUrl = `${window.location.origin}${window.location.pathname}#verification`;
  protected readonly qrCodeUrl = signal('');
  protected readonly qrCodeBusy = signal(false);
  protected readonly qrCodeStatus = signal('');
  protected readonly studentPageSize = 8;
  protected readonly studentPage = signal(1);
  protected readonly studentPageCount = computed(() => Math.max(1, Math.ceil(this.students().length / this.studentPageSize)));
  protected readonly pagedStudents = computed(() => {
    const start = (this.studentPage() - 1) * this.studentPageSize;
    return this.students().slice(start, start + this.studentPageSize);
  });
  protected readonly studentPageRange = computed(() => {
    const total = this.students().length;
    if (!total) return '0 records';
    const start = (this.studentPage() - 1) * this.studentPageSize + 1;
    const end = Math.min(total, start + this.studentPageSize - 1);
    return `${start}–${end} of ${total}`;
  });
  protected readonly currentYear = new Date().getFullYear();

  protected readonly navItems = [
    { label: 'Home', href: '#home', verification: false, admin: false },
    { label: 'Academic Scope', href: '#academic-scope', verification: false, admin: false },
    { label: 'Verification', href: '#verification', verification: true, admin: false },
    { label: 'About Us', href: '#academic-scope', verification: false, admin: false },
    { label: 'Programs', href: '#programs', verification: false, admin: false },
    { label: 'Contact', href: '#contact', verification: false, admin: false },
    { label: 'Login', href: '#admin', verification: false, admin: true }
  ];

  protected readonly programs = [
    { category: 'Computer aided design', title: 'AutoCAD', copy: 'Technical 2D and 3D drafting and engineering design layouts.', image: 'https://images.pexels.com/photos/3862379/pexels-photo-3862379.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { category: 'Built environment', title: 'Construction Management', copy: 'Planning, site coordination and safe project delivery.', image: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { category: 'Digital technology', title: 'Computer Engineering', copy: 'Computer systems, hardware and technical support.', image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { category: 'Applied engineering', title: 'Electrical Technology', copy: 'Electrical systems, controls and maintenance practice.', image: 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { category: 'Future energy', title: 'Solar Energy', copy: 'Renewable energy systems, installation and maintenance.', image: 'https://images.pexels.com/photos/356036/pexels-photo-356036.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { category: 'Digital technology', title: 'Web Development', copy: 'User-focused websites, front-end design and web skills.', image: 'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=600' }
  ];

  constructor() {
    window.addEventListener('hashchange', () => {
      this.verificationPage.set(window.location.hash === '#verification');
      this.resultPage.set(window.location.hash === '#result');
      this.adminPage.set(window.location.hash === '#admin');

      if (window.location.hash === '#admin') void this.loadAdminSession();
    });

    // A browser refresh does not emit hashchange, so restore the persisted
    // Firebase session when the Login page is the initial route.
    if (this.adminPage()) void this.loadAdminSession();
  }

  protected toggleMenu(): void { this.menuOpen.update(open => !open); }
  protected closeMenu(): void { this.menuOpen.set(false); }

  protected openVerification(event: Event): void {
    event.preventDefault();
    this.menuOpen.set(false);
    this.resultPage.set(false);
    this.adminPage.set(false);
    this.activeRecord.set(null);
    this.verificationStatus.set('');
    this.verificationPage.set(true);
    window.location.hash = 'verification';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async verify(event: SubmitEvent, roll: string, year: string): Promise<void> {
    event.preventDefault();
    const rollNo = roll.trim();
    const passingYear = year.trim();

    if (!/^\d{1,12}$/.test(rollNo) || !/^\d{4}$/.test(passingYear)) {
      this.verificationStatus.set('Please enter a valid numeric roll number and four-digit passing year.');
      return;
    }

    this.searchBusy.set(true);
    this.verificationStatus.set('');
    try {
      const { findStudentRecord } = await import('./student-records');
      this.activeRecord.set(await findStudentRecord(rollNo, passingYear));
      this.verificationPage.set(false);
      this.resultPage.set(true);
      window.location.hash = 'result';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      this.verificationStatus.set('Unable to check this record right now. Please try again.');
    } finally {
      this.searchBusy.set(false);
    }
  }

  protected newSearch(event: Event): void { this.openVerification(event); }
  protected downloadResult(): void { window.print(); }

  protected async generateVerificationQr(): Promise<void> {
    if (this.qrCodeUrl() || this.qrCodeBusy()) return;

    this.qrCodeBusy.set(true);
    this.qrCodeStatus.set('');
    try {
      // The QR library is CommonJS. Depending on the production bundler, its
      // browser API can be exposed directly or under `default`.
      type QrCodeApi = {
        toDataURL: (text: string, options: {
          width: number;
          margin: number;
          errorCorrectionLevel: 'M';
          color: { dark: string; light: string };
        }) => Promise<string>;
      };
      const qrModule = await import('qrcode') as unknown as Partial<QrCodeApi> & { default?: QrCodeApi };
      const toDataURL = qrModule.toDataURL ?? qrModule.default?.toDataURL;
      if (!toDataURL) throw new Error('QR generator is unavailable.');

      this.qrCodeUrl.set(await toDataURL(this.verificationUrl, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f4424', light: '#ffffff' }
      }));
    } catch {
      this.qrCodeStatus.set('QR code could not be generated. Please reload the page.');
    } finally {
      this.qrCodeBusy.set(false);
    }
  }

  protected downloadVerificationQr(): void {
    const qrCode = this.qrCodeUrl();
    if (!qrCode) return;

    const download = document.createElement('a');
    download.href = qrCode;
    download.download = 'bste-verification-qr.png';
    download.click();
  }

  protected openAdmin(event: Event): void {
    event.preventDefault();
    this.menuOpen.set(false);
    this.resultPage.set(false);
    this.verificationPage.set(false);
    this.adminPage.set(true);
    this.authStatus.set('');
    void this.loadAdminSession();
    window.location.hash = 'admin';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async submitAdmin(event: SubmitEvent, email: string, password: string): Promise<void> {
    event.preventDefault();
    if (!email.trim() || !password) {
      this.authStatus.set('Please enter an email address and password.');
      return;
    }

    this.authBusy.set(true);
    this.authStatus.set('');

    try {
      const [{ firebaseAuth }, auth] = await Promise.all([
        import('./firebase'),
        import('firebase/auth')
      ]);
      const credential = await auth.signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);

      const { ensureAdminProfile } = await import('./student-records');
      await ensureAdminProfile(credential.user.uid, credential.user.email);
      this.signedInEmail.set(credential.user.email ?? email.trim());
      this.adminAuthorized.set(true);
      this.authStatus.set('Signed in with administrator access.');
      await this.loadStudents();
      void this.generateVerificationQr();
    } catch (error: unknown) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'This email already has an account. Please sign in instead.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Use a password with at least 6 characters.',
        'auth/operation-not-allowed': 'Enable Email/Password in Firebase Authentication first.'
      };
      this.authStatus.set(messages[code] ?? 'Unable to authenticate. Please try again.');
    } finally {
      this.authBusy.set(false);
    }
  }

  protected async signOutAdmin(): Promise<void> {
    const [{ firebaseAuth }, auth] = await Promise.all([import('./firebase'), import('firebase/auth')]);
    await auth.signOut(firebaseAuth());
    this.signedInEmail.set('');
    this.adminAuthorized.set(false);
    this.students.set([]);
    this.editingRecord.set(null);
    this.authStatus.set('You have been signed out.');
  }

  protected async saveStudent(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const value = (field: string) => String(values.get(field) ?? '').trim();
    const input: StudentRecordInput = {
      rollNo: value('rollNo'),
      passingYear: value('passingYear'),
      name: value('name'),
      fatherName: value('fatherName'),
      registrationNo: value('registrationNo'),
      programme: value('programme'),
      session: value('session'),
      grade: value('grade'),
      totalMarks: Number(value('totalMarks')),
      obtainedMarks: Number(value('obtainedMarks'))
    };

    if (!/^\d{1,12}$/.test(input.rollNo) || !/^\d{4}$/.test(input.passingYear) || !input.name || !input.programme || input.totalMarks <= 0 || input.obtainedMarks < 0) {
      this.recordStatus.set('Please complete all required record details with valid marks.');
      return;
    }

    this.recordBusy.set(true);
    this.recordStatus.set('');
    try {
      const { deleteStudentRecord, saveStudentRecord } = await import('./student-records');
      const previous = this.editingRecord();
      const saved = await saveStudentRecord(input);
      if (previous && previous.id !== saved.id) await deleteStudentRecord(previous.id);
      this.editingRecord.set(null);
      form.reset();
      this.recordStatus.set(previous ? 'Student record updated.' : 'Student record saved.');
      await this.loadStudents();
    } catch {
      this.recordStatus.set('Unable to save. Confirm that Firestore is enabled and this account has admin access.');
    } finally {
      this.recordBusy.set(false);
    }
  }

  protected editStudent(record: StudentRecord): void {
    this.editingRecord.set(record);
    this.recordStatus.set('Editing selected record.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEdit(): void {
    this.editingRecord.set(null);
    this.recordStatus.set('Edit cancelled.');
  }

  protected setStudentPage(page: number): void {
    this.studentPage.set(Math.min(Math.max(1, page), this.studentPageCount()));
  }

  protected async removeStudent(record: StudentRecord): Promise<void> {
    if (!window.confirm(`Delete the record for ${record.name}?`)) return;

    this.recordBusy.set(true);
    try {
      const { deleteStudentRecord } = await import('./student-records');
      await deleteStudentRecord(record.id);
      if (this.editingRecord()?.id === record.id) this.editingRecord.set(null);
      this.recordStatus.set('Student record deleted.');
      await this.loadStudents();
    } catch {
      this.recordStatus.set('Unable to delete. Confirm that this account has admin access.');
    } finally {
      this.recordBusy.set(false);
    }
  }

  private async loadAdminSession(): Promise<void> {
    try {
      const [{ firebaseAuth }, auth] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      const user = await new Promise<import('firebase/auth').User | null>((resolve) => {
        let unsubscribe: () => void = () => {};
        unsubscribe = auth.onAuthStateChanged(firebaseAuth(), (currentUser) => {
          unsubscribe();
          resolve(currentUser);
        });
      });
      this.signedInEmail.set(user?.email ?? '');
      if (!user) {
        this.adminAuthorized.set(false);
        return;
      }

      const { ensureAdminProfile } = await import('./student-records');
      await ensureAdminProfile(user.uid, user.email);
      this.adminAuthorized.set(true);
      await this.loadStudents();
      void this.generateVerificationQr();
    } catch {
      this.authStatus.set('Unable to connect to Firebase Authentication.');
    }
  }

  private async loadStudents(): Promise<void> {
    this.studentsLoading.set(true);
    try {
      const { listStudentRecords } = await import('./student-records');
      const records = await listStudentRecords();
      this.students.set(records);
      this.studentPage.update((page) => Math.min(page, Math.max(1, Math.ceil(records.length / this.studentPageSize))));
    } catch {
      this.recordStatus.set('Unable to load records. Check Firestore setup and admin permissions.');
    } finally {
      this.studentsLoading.set(false);
    }
  }
}
