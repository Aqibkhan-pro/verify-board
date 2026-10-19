import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { firebaseApp } from './firebase';

export interface StudentRecord {
  id: string;
  rollNo: string;
  passingYear: string;
  name: string;
  fatherName: string;
  registrationNo: string;
  programme: string;
  session: string;
  grade: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
}

export type StudentRecordInput = Omit<StudentRecord, 'id' | 'percentage'>;

const firestore = getFirestore(firebaseApp);
const students = collection(firestore, 'students');

/** Every authenticated portal user intentionally receives the admin role. */
export async function ensureAdminProfile(uid: string, email: string | null): Promise<void> {
  await setDoc(
    doc(firestore, 'users', uid),
    {
      email: email ?? '',
      role: 'admin',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function studentRecordId(rollNo: string, passingYear: string): string {
  return `${rollNo.trim()}_${passingYear.trim()}`;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRecord(id: string, data: Record<string, unknown>): StudentRecord {
  const totalMarks = numberValue(data['totalMarks']);
  const obtainedMarks = numberValue(data['obtainedMarks']);
  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;

  return {
    id,
    rollNo: String(data['rollNo'] ?? ''),
    passingYear: String(data['passingYear'] ?? ''),
    name: String(data['name'] ?? ''),
    fatherName: String(data['fatherName'] ?? ''),
    registrationNo: String(data['registrationNo'] ?? ''),
    programme: String(data['programme'] ?? ''),
    session: String(data['session'] ?? ''),
    grade: String(data['grade'] ?? ''),
    totalMarks,
    obtainedMarks,
    percentage
  };
}

export async function findStudentRecord(rollNo: string, passingYear: string): Promise<StudentRecord | null> {
  const snapshot = await getDoc(doc(students, studentRecordId(rollNo, passingYear)));
  return snapshot.exists() ? toRecord(snapshot.id, snapshot.data()) : null;
}

export async function listStudentRecords(): Promise<StudentRecord[]> {
  const snapshot = await getDocs(students);
  return snapshot.docs
    .map((item) => toRecord(item.id, item.data()))
    .sort((a, b) => b.passingYear.localeCompare(a.passingYear) || a.rollNo.localeCompare(b.rollNo));
}

export async function saveStudentRecord(input: StudentRecordInput): Promise<StudentRecord> {
  const id = studentRecordId(input.rollNo, input.passingYear);
  const totalMarks = numberValue(input.totalMarks);
  const obtainedMarks = numberValue(input.obtainedMarks);
  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
  const record = { ...input, totalMarks, obtainedMarks, percentage };

  await setDoc(doc(students, id), { ...record, updatedAt: serverTimestamp() }, { merge: true });
  return { ...record, id };
}

export async function deleteStudentRecord(id: string): Promise<void> {
  await deleteDoc(doc(students, id));
}
