import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBpXHMwTdbnfPjP_aBNFdZ_-R7RvVsH3dk',
  authDomain: 'verify-board.firebaseapp.com',
  projectId: 'verify-board',
  storageBucket: 'verify-board.firebasestorage.app',
  messagingSenderId: '725705937871',
  appId: '1:725705937871:web:e56a66c57752c97234b8ba',
  measurementId: 'G-ZVRS55JY7Y'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (typeof window !== 'undefined') {
  void isSupported().then((supported) => {
    if (supported) getAnalytics(firebaseApp);
  });
}

export const firebaseAuth = () => getAuth(firebaseApp);
