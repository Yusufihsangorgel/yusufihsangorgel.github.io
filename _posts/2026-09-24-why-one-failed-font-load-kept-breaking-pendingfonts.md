---
layout: post
title: "Why one failed font load kept breaking pendingFonts() in Flutter"
date: 2026-09-24 19:05:05 +0300
tags: ["flutter", "dart", "testing", "debugging"]
image: /assets/img/google-fonts-pending/cover.png
devto_url: "https://dev.to/yusufihsangorgel/why-one-failed-font-load-kept-breaking-pendingfonts-in-flutter-3o6g"
canonical_url: "https://dev.to/yusufihsangorgel/why-one-failed-font-load-kept-breaking-pendingfonts-in-flutter-3o6g"
description: "In google_fonts 8.2.0 a failed font load stayed in the set that pendingFonts() waits on, and every later call threw the old error, even after a retry loaded the font. What each half of the fix in 8.2.1 does."
---

*Also published on [dev.to](https://dev.to/yusufihsangorgel/why-one-failed-font-load-kept-breaking-pendingfonts-in-flutter-3o6g) and [Medium](https://medium.com/@developeryusufihsan/why-one-failed-font-load-kept-breaking-pendingfonts-in-flutter-8564add45473).*

In google_fonts 8.2.0, one failed font load stayed in the set that `GoogleFonts.pendingFonts()` waits on, and every later call threw.

It kept throwing after a retry loaded the same font.

If your widget tests or your startup code await `pendingFonts()` on 8.2.0, one bad download is enough. Version 8.2.1 stops the failure from sticking.

A google_fonts user, @bramp, reported it in [issue #182430](https://github.com/flutter/flutter/issues/182430) in February, named the cause and proposed the fix: `whenComplete` with `catchError`, plus a test for it. I applied it in [flutter/packages#12240](https://github.com/flutter/packages/pull/12240) with `ignore()` in place of `catchError` and a regression test, released as version 8.2.1 on July 31.

## What a test sees

The test in the last section calls `GoogleFonts.lato()`, then awaits `pendingFonts()` three times, each call inside `try/catch`.

In this test `TestWidgetsFlutterBinding` answers the default HTTP client with status 400, and the font download fails without any mock. The output blocks below are excerpts of the recorded runs.

On 8.2.0 all three runs exited with code 1. The test failed on an uncaught error:

```text
00:00 +0 -1: pendingFonts after a failed load [E]
  Exception: Failed to load font with url: https://fonts.gstatic.com/s/a/5ced1045820caaac87af3f61ded09bacc90881f158d04c59dcce436fd02ad368.ttf
  package:google_fonts/src/google_fonts_base.dart 275:5            _httpFetchFontAndSaveToDevice
  ===== asynchronous gap ===========================
  dart:async                                                       _CustomZone.registerBinaryCallback
  package:google_fonts/src/google_fonts_base.dart 144:23           loadFontIfNecessary
  package:google_fonts/src/google_fonts_base.dart 107:38           googleFontsTextStyle
  package:google_fonts/src/google_fonts_parts/part_l.dart 1375:12  PartL.lato
  test/pending_fonts_test.dart 11:21                               main.<fn>
```

After the test binding's warning about status 400, the output ends with all three calls throwing, although each one was caught:

```text
first pendingFonts(): threw _Exception
second pendingFonts(): threw _Exception
third pendingFonts(): threw _Exception
00:00 +0 -1: Some tests failed.
```

On 8.2.1 all three runs exited with code 0. The first call still threw, because that load really failed. The later calls completed:

```text
first pendingFonts(): threw _Exception
second pendingFonts(): completed
third pendingFonts(): completed
00:00 +1: All tests passed!
```

**On 8.2.1 a failed load fails the calls already waiting for it, and none that come after it.**

A completed `pendingFonts()` means no failed load is still pending. It does not mean the font is available: the first call still sees the failure, and only another request for the font retries it.

## One line, two problems

`pendingFontFutures` is a top-level set of loading futures, and [`pendingFonts()`](https://github.com/flutter/packages/blob/ac87e65333e1159022267053c009f747667f6f50/packages/google_fonts/lib/src/google_fonts_all_parts.dart#L110) is `Future.wait(pendingFontFutures)`.

The production-code change is one line ([lines 107-109](https://github.com/flutter/packages/blob/ac87e65333e1159022267053c009f747667f6f50/packages/google_fonts/lib/src/google_fonts_base.dart#L107-L109) after the fix); the pull request also updated the set's doc comment and added a test:

```diff
   final Future<void> loadingFuture = loadFontIfNecessary(descriptor);
   pendingFontFutures.add(loadingFuture);
-  loadingFuture.then((_) => pendingFontFutures.remove(loadingFuture));
+  loadingFuture.whenComplete(() => pendingFontFutures.remove(loadingFuture)).ignore();
```

In 8.2.0 that `then` callback is the only code that removes anything from the set: the library names the set in four places (its declaration, the `add`, this `remove` and the `Future.wait`).

A `then` callback without `onError` runs only when the future succeeds. A failed load stays in the set, and every later `Future.wait` over the set fails. That is the cause @bramp's issue named.

The same line has a second problem. [`then`](https://api.dart.dev/dart-async/Future/then.html) returns a new future, and without `onError` the error "is forwarded directly to the returned future."

Nothing listens to that returned future. Its error is uncaught, and `flutter test` fails the test for it, even when every `pendingFonts()` call is caught.

In 8.2.1, [`whenComplete`](https://api.dart.dev/dart-async/Future/whenComplete.html) runs the removal on success and on error. Its returned future fails the same way as the load, and [`ignore()`](https://api.dart.dev/dart-async/FutureExtensions/ignore.html) handles that error. Callers of `pendingFonts()` still get the load's own failure.

## Each half on its own

Five versions of line 109 were measured. Each ran the pull request's test and a retry test three times, with the same result every time (`remove` is the removal callback):

| line 109 | `pendingFonts()` after the failure | uncaught error |
|---|---|---|
| `.then(remove)` (8.2.0) | throw the old error | yes |
| `.then(remove).ignore()` | throw the old error | no |
| `.whenComplete(remove)` | complete | yes |
| `.whenComplete(remove).ignore()` (8.2.1) | complete | no |
| `.whenComplete(remove).catchError((_) {})` (the issue's version) | complete | no |

![Four forms of line 109: then leaves later pendingFonts() calls throwing, and a missing ignore() leaves an uncaught error](https://yusufihsangorgel.github.io/assets/img/google-fonts-pending/variants.png)

Each problem shows up as its own error report in the test output. With `.whenComplete(remove)` alone the set is clean, and the pull request's test still fails on the uncaught error:

```text
00:00 +0 -1: pendingFonts removes failed font loads [E]
  Exception: Failed to load font with url: https://fonts.gstatic.com/s/a/1194f6ffe4d2f05258573616a77932c38041f3102763096c19437c3db1818a04.ttf
  package:google_fonts/src/google_fonts_base.dart 275:5   _httpFetchFontAndSaveToDevice
  ===== asynchronous gap ===========================
  dart:async                                              _CustomZone.registerBinaryCallback
  package:google_fonts/src/google_fonts_base.dart 152:9   loadFontIfNecessary
  package:google_fonts/src/google_fonts_base.dart 107:38  googleFontsTextStyle
  test/load_font_if_necessary_test.dart 374:5             main.<fn>
  
00:00 +0 -1: Some tests failed.
```

**`whenComplete` cleans the set and `ignore()` handles the future it returns. Drop either half and one failure comes back.**

The issue's version used `catchError((_) {})` where 8.2.1 uses `ignore()`. It passed the same tests, and these tests do not tell them apart.

The pull request's own test fails at the parent commit in three runs out of three and passes at the merge commit. The whole test file goes from 11 passed and 1 failed to 12 passed.

## On 8.2.0, a successful retry does not help

When a load fails, `loadFontIfNecessary` forgets the font, and a later request for the same font tries to load it again.

The retry test answers 404 first, then 200, and requests the same font twice. The retry's own future completes.

With a `then` line one future is still in the set, and `pendingFonts()` throws the first error again. The output below is from `.then(remove).ignore()`, to keep it to one error report:

```text
retry loaded; pending futures: 1
00:00 +0 -1: pendingFonts after a failed load and a successful retry [E]
  Exception: Failed to load font with url: https://fonts.gstatic.com/s/a/1194f6ffe4d2f05258573616a77932c38041f3102763096c19437c3db1818a04.ttf
  package:google_fonts/src/google_fonts_base.dart 275:5  _httpFetchFontAndSaveToDevice
  
00:00 +0 -1: Some tests failed.
```

![In 8.2.0 the failed future stays in the set; a retry loads the font, and pendingFonts() still throws the first error](https://yusufihsangorgel.github.io/assets/img/google-fonts-pending/retry.png)

With `whenComplete` the set is empty after the retry.

**In 8.2.0, loading the font later did not clear the failure.**

## What this does not cover

Every run here is `flutter test` on the Dart VM. The HTTP 400 in the first test comes from the test binding, not from a real outage.

What the uncaught error does in a running app was not measured: the zone handler, `PlatformDispatcher.onError` and crash reporters are outside these runs. The web was not measured either.

No workaround for 8.2.0 was measured.

## Use 8.2.1

The pull request merged on July 31, 2026, and google_fonts 8.2.1 was published 17 minutes later. Its [changelog](https://pub.dev/packages/google_fonts/changelog) entry reads "Fixes `pendingFonts()` retaining failed font loads."

On September 24 it is still the latest release.

## Check it yourself

In an empty directory, create this `pubspec.yaml`:

```yaml
name: app
publish_to: none
environment:
  sdk: ^3.10.0
dependencies:
  flutter:
    sdk: flutter
  google_fonts: 8.2.0
dev_dependencies:
  flutter_test:
    sdk: flutter
```

Create a `test` directory (`mkdir -p test`) and save this as `test/pending_fonts_test.dart`:

```dart
// Reproduction for flutter/packages#12240: pendingFonts() after one failed font load.
// TestWidgetsFlutterBinding answers the default HTTP client with status 400, and the font fetch fails on its own.
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('pendingFonts after a failed load', () async {
    GoogleFonts.config.allowRuntimeFetching = true;
    GoogleFonts.lato();

    for (final call in ['first', 'second', 'third']) {
      try {
        await GoogleFonts.pendingFonts();
        print('$call pendingFonts(): completed');
      } catch (e) {
        print('$call pendingFonts(): threw ${e.runtimeType}');
      }
    }
  });
}
```

Then run:

```sh
flutter pub get
flutter test test/pending_fonts_test.dart
```

Change the dependency to `google_fonts: 8.2.1`, run `flutter pub get` again and rerun the test. The recorded runs used Flutter 3.41.2 and Dart 3.11.0.
