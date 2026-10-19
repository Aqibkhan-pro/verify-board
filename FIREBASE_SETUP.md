# Firestore setup

1. In the Firebase Console for `verify-board`, open **Build → Firestore Database** and create the default database.
2. Open the **Rules** tab, replace the rules with the contents of `firestore.rules`, then publish them.
3. In **Build → Authentication → Sign-in method**, enable **Email/Password**.
4. Open `/#admin` in the website, then sign in with the administrator account you already created.

## Administrator access

This project is intentionally configured so **every email/password user who signs in or signs up becomes an administrator**. The app writes that user's profile to `users/{uid}` with the role `admin`, and the Firestore rules allow any signed-in profile with that role to manage student records.

The website intentionally has no public account-creation screen. Only an account already created in Firebase Authentication can sign in from the Login page.
