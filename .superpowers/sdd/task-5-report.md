# Task 5 Report — Wire HostAccount and GuestAccount Routes

**Status:** DONE

## Changes Made

1. **`src/types/index.ts`** — Replaced `EditProfile: undefined` with `HostAccount: undefined` and `GuestAccount: undefined` in `RootStackParamList`.

2. **`src/navigation/index.tsx`** — Replaced `import EditProfileScreen` with imports for `HostAccountScreen` and `GuestAccountScreen`. Replaced the single `EditProfile` Stack.Screen with two screens: `HostAccount` and `GuestAccount`, both with `headerShown: false, animation: 'slide_from_right'`.

3. **`src/screens/ProfileScreen.tsx`** — Updated `navigateToEditProfile()` to call `navigation.navigate('GuestAccount')`.

4. **`src/screens/HostProfileScreen.tsx`** — Replaced all 2 occurrences of `navigation.navigate('EditProfile')` with `navigation.navigate('HostAccount')` (edit button on profile card, and settings menu item).

## Commit

`c0e65c2` feat: wire HostAccount and GuestAccount routes, remove EditProfile
