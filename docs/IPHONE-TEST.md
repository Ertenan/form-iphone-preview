# Physical iPhone acceptance test — milestone 1

This is a synthetic-data test of the core workout loop. No programs, analytics, or cloud-sync features should be added until device issues are resolved. Physical device results are pending; desktop checks cannot establish iOS behavior.

## Hosting choice and access

- **Chosen: connected Sites hosting.** Dedicated owner-private HTTPS origin: https://form-iphone-lab-20261023.jammydream17.chatgpt.site . The final deployment result in the chat confirms when this is live. Sign in with the same ChatGPT account that owns this preview. Hosting authentication protects delivery; it does not add cloud sync to the journal.
- **Local Vite preview:** useful for desktop QA. `localhost` on an iPhone refers to the iPhone itself. A plain HTTP LAN URL is insufficient for service-worker/offline installation testing.
- **Another host or tunnel:** no Vercel/Netlify/Wrangler/cloudflared/ngrok CLI or existing deployment configuration was found in this workspace. No additional provider account or tunnel is needed for the connected hosting path.

The Sites URL is a real hosted publication used as a dedicated test environment. It remains owner-private. Source and static application assets are published; workouts remain in local IndexedDB on each device. No local browser journal or exported backup is uploaded to the host.

## Preview identity and synthetic data

Build label: `iphone-core-2026-10-23.1`; Home Screen name: **Form Test**. The gold banner identifies the test environment.

`npm run build:iphone-preview` builds this opt-in variant. `npm run build` still builds the ordinary empty-journal app. On first initialization only, the preview seeds:

- `SAMPLE · Upper body`: two sets each of dumbbell bench press, assisted pull-up and weighted pull-up.
- `SAMPLE · Previous session`: a fictional completed workout for previous-performance display.
- All values use kg and RIR initially. Dumbbell targets are 20 kg per dumbbell × 10 reps, 2 RIR. Assistance is +30 kg of help × 8 reps; weighted pull-up is +5 kg added × 6 reps.

These are test fixtures, not personal records or training prescriptions. Enter invented data throughout this test. Existing data is never automatically re-seeded or replaced. Safari and the installed app may have different storage contexts; perform all workout and backup tests from the Home Screen app after installation. Do not switch between contexts to infer data loss.

## 0. Install online

1. Open the HTTPS link in **Safari**, not an embedded messaging browser. Sign in to the owning ChatGPT account if prompted. If it says access denied, report that before proceeding; do not change sharing or remove the private boundary.
2. Confirm the gold test banner and `SAMPLE` routine. A new iPhone journal should contain exactly one sample template and one sample completed workout.
3. Tap Safari's Share control (it may be under More), choose **Add to Home Screen**, leave **Open as Web App** enabled if that option appears, then tap **Add**. Name it **Form Test**.
4. Launch **Form Test** from the Home Screen while online. Sign in again if requested. Go to **Profile**, and wait for **Offline app shell is ready on this browser**. If offline setup reports an error or never becomes ready, stop before airplane-mode testing and report the message.
5. Confirm all five tabs are usable and visible above the Home indicator. Check that opening the numeric keyboard does not hide the focused input or prevent reaching the completion control. Programs and Progress analytics should say unavailable.

Apple references: [Home Screen installation](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [downloaded files](https://support.apple.com/102440).

## 1. Create a template and finish a workout

1. **Library → Templates → Create template.** Name it `IPHONE QA`. Add **Dumbbell bench press** by searching `dumbbell bench`, then add **Assisted pull-up**.
2. Set bench targets to 20 kg, 10 reps, 2 RIR. Set rest to 90 seconds. Save. Confirm the template appears in Library and Train.
3. Start it. Actual results should initially be blank, while targets are visible. A previous bench performance should be available from the sample session.
4. Enter 20 kg and 10 reps, then edit to **22.5 kg, 8 reps, 1.5 RIR**. Switch the Effort control to **RPE**: the same value must become **8.5**. Switch back: it must be **1.5 RIR**. Edit it through RPE to 8, then switch back: expect 2 RIR.
5. Add a set. Enter a second result, change its type to warm-up or drop, then remove that extra set. Remaining set values must not move to a different set. Complete at least one valid set with the check control. A completed set should be visibly marked and start rest.
6. For assisted pull-ups, enter **30 kg assistance**, 8 reps. The label must say that more assistance is easier. For dumbbells, the label must say load **per dumbbell**. In a separate sample workout, weighted pull-up load means **added load only**.
7. Finish, add a note, and save the completed workout. Find it in **History**, open it, and correct a result. Reopen History to confirm the correction persisted. The standalone template's targets must stay unchanged.

## 2. Lock/unlock and timer persistence

1. Start another `IPHONE QA` workout and complete a set to start a 90-second rest timer.
2. Note the remaining time, lock the phone for about 20 seconds, unlock and reopen Form Test. A **running** rest timer should have about 20 seconds less remaining (allow a couple seconds for handling the phone).
3. **Pause the rest timer**, note its value, lock for about 30 seconds, unlock. Its value must remain the same. Resume: it must count down from that value.
4. Test **+15s**, **−15s**, and a manual override of **60 seconds**. Pause, close/reopen, and confirm the override/paused value persisted. The rest timer may reach zero while locked; it should show readiness when reopened. No background alarm is promised.
5. Separately **pause Workout time**. Lock for about 30 seconds. Workout duration must stay paused, independently of the rest timer. Resume and confirm it advances.
6. Optional long suspension check: with workout duration running, make one edit, then leave it inactive for over 60 minutes. On return, it must pause at **last meaningful action + 60 minutes**, show an inactivity message, and keep every set. The first 60 idle minutes count; later idle time does not. Resume must be explicit. Do not mark this device check passed merely because the automated clock tests passed.

## 3. Recover an unfinished workout

1. Leave at least one logged set and one partial set (e.g. weight filled, reps blank). Pause rest and note its value. Wait for **Saved on this device**.
2. Close the app from the App Switcher, then launch it from the Home Screen. Do not delete the app or clear website data.
3. Tap the in-progress workout banner. Expect the same workout, completed set, partial inputs, notes, effort values and timer pause state. There must be no duplicate active workout.

## 4. True offline cold launch and logging

1. After the installed app has reported offline readiness, enable airplane mode and explicitly turn **Wi-Fi off** too. Airplane mode alone may leave Wi-Fi enabled.
2. Close Form Test from the App Switcher, then launch it using its Home Screen icon. Expect the app shell and saved journal, without a network error or a sign-in page.
3. Resume the unfinished workout. Search/add an exercise, edit weight/reps/effort, add/remove a set, complete a set and finish the workout. Everything must save locally.
4. Close and reopen while still offline. Find the finished workout in History and verify the edits.
5. Restore connectivity. The data must remain intact. There is no cloud-sync step to wait for.

## 5. Export/restore through Files

1. While online, start a synthetic `BACKUP QA` workout, enter a partial result, start then pause a rest timer, and note the paused value. Leave the workout unfinished.
2. In the **Home Screen app**, go to **Profile → Export JSON backup**. Accept the download if asked. In Files, find `form-backup-YYYY-MM-DD.json` in the configured Downloads location (On My iPhone or iCloud Drive). If a JSON preview opens, use its Share control to save it to Files. Report if none of these actions is offered. Do not assume a download succeeded merely because the app displayed its toast.
3. Make a visible change after the export: create a throwaway template named `RESTORE MARKER`. Do not create a second active workout.
4. **Profile → Choose backup to restore**. Use the Files picker to select the just-exported JSON, taking care with numbered duplicates from earlier exports.
5. Check the preview's timestamp and counts, then choose **Replace journal with this backup**. This deliberately replaces this test journal; it is safe only because all data is synthetic. A real journal should always be exported first.
6. Expect `RESTORE MARKER` to disappear, the earlier workouts to remain, and `BACKUP QA` to return unfinished with the saved partial result and paused rest value. Reopen the app and verify again. Finish that restored workout when done.
7. Optional negative check: select a non-backup JSON file. It must be rejected without changing the current journal.

## Report results and hold the phase gate

Send your iPhone model, iOS version, and the first failing step number. For a failure, include expected versus actual behavior and whether the app was online, offline, unlocked or restored from lock. A screenshot is useful if the layout or error text is unclear.

Record each device result as **pending / passed / failed**. Current device status for steps 0–5: **pending**. If any step fails, preserve the test journal/backup and report it; do not reinstall or clear storage as the first troubleshooting step. Fix and republish the same origin, then repeat the failing scenario before any next feature phase.
