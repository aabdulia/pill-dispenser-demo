# Smart pill dispenser concept demo

A browser-based demo of a dispenser view and caregiver view sharing one state machine. The dispenser's camera drives the flow: face detection starts the reminder, and a hand-to-mouth gesture after dispensing flags possible intake. Run it with your own webcam, or with a **simulated person** whose synthetic landmarks go through the same vision pipeline. It cannot identify a person, see a swallowed pill, or prove that medication was taken.

## Run locally

Serve the directory (camera access requires localhost or HTTPS):

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

- **Start camera demo**: step into frame to trigger the reminder, press dispense (on-screen button or <kbd>Space</kbd>), bring your fingertips to your mouth and hold them there, then hold a thumbs-up or press **Confirm taken**. The camera view shows the face box, mouth zone, hand landmarks and fingertip-to-mouth distance.
- **Run simulated demo**: an animated person goes through both doses. No camera is needed.
- The manual buttons still work as a fallback.

Camera mode runs MediaPipe detection on the device. It it loads model files from Google's hosting and JavaScript from jsDelivr. No frames are uploaded by this app. Browser speech uses `speechSynthesis` and may need a user click before audio works.

## Publish on GitHub Pages

Create a GitHub repository, put the **contents of this folder at its root**, push to `main`, then choose **Settings → Pages → Deploy from a branch → main / (root)**. The `.nojekyll` file ensures the static assets are served directly. Enforce HTTPS. The result will be `https://YOUR-USERNAME.github.io/YOUR-REPO/`. The site has no build step or server.

## CAD

Paste [`cad/AI_CAD_PROMPT.md`](cad/AI_CAD_PROMPT.md) into Zoo Design Studio. Export STEP as the editable handoff and GLB or STL for visualization. The included OpenSCAD concept can be edited and regenerated:

```bash
openscad -o cad/dispenser.stl cad/dispenser.scad
python3 cad/render_stl.py
```

The website shows the Zoo export in an interactive 3D viewer (three.js, loaded from jsDelivr): `cad/dispenser-model.step` is the editable handoff, and `cad/dispenser-model.stl` is a binary STL of the same model for the viewer and for download. To update it, export both from Zoo again and replace those two files. `cad/dispenser.scad` and `cad/dispenser.stl` are the earlier OpenSCAD concept.

## State and evidence

The demo sequence is `scheduled → person present → voice reminder → button pressed → dispensed → observed / uncertain / missed → next dose scheduled`. The next reminder starts from a **configured schedule**, never from visual inference or an automatically inferred dose interval. Dispensing is locked after one press for that dose. The caregiver panel mirrors events in the same browser tab. In a real two-device product it needs an authenticated backend and event sync.

Webcam mode uses MediaPipe Face Landmarker and Hand Landmarker. It looks for at least one face for presence, then a hand tip near the mouth after dispense. Such motion is **only a signal for “possible intake”**; the UI requires a separate explicit confirmation in this concept. Face detection is not facial recognition. If identity is important, add consented enrollment, an authorized face matching component, and a PIN or caregiver fallback after testing failure cases. Do not use this prototype to dispense actual medication or direct care.

## Next prototype gates

1. Interview 5–8 caregivers and older adults about whether reminders and a shared log solve the problem and whether a room-facing camera is acceptable.
2. Test false positive / false negative sequences: cup lifted without swallowing, hand touching face, visitor entering, poor lighting, occlusion, repeated presses, power/network loss.
3. Only after the workflow is validated, prototype a supervised physical mechanism with a pharmacist or medication-safety expert. Prescription schedules, missed doses, refills, and escalation rules require clinical review.

## Sources

- [Zoo Design Studio and export](https://docs.zoo.dev/design-studio)
- [MediaPipe face landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [MediaPipe hand landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [GitHub Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
