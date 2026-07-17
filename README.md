# Total-Visual-Art

## Firebase setup

- `firebase.json`, `firestore.rules`, `storage.rules` have been added to this repo.
- Copy `.firebaserc.example` to `.firebaserc` and replace the placeholder with your real Firebase project id.
- Deploy rules with `firebase deploy --only firestore:rules,storage`.

## Notes

- The current client flow looks up classes by invite code directly from Firestore, so the Firestore rules allow authenticated reads on `classes`.
- Route-level access checks were added in the app, but Firestore rules still need to be deployed for real protection.
