# NeoPixel Animation and Positioning Library

I'm not building an animation library - i'm building a dashboard visualizer and planner, which will then output NeoPixel library code according to the light sequence you've created through the Web Dashboard.

It is a (library?) built on top of NeoPixel C++ library or a feature that generates code to copy paste into your original Arduino IDE C++ sketch.

### What this solves

Planning LED animations has been a very manual process. Afterwards, there still needs to be a step of 
An interesting outcome is users being able customize their NeoPixels colors and animation from network. In the future, this could be an alternative Connected Device project.

---

## Architecture & Settings

Open Source Tiny tool → web tool? Library? ~~API call?~~

→ using Browser Native Canvas API only + Vanilla JS / CSS / HTML. No libraries.

→ Lightweight to be processed on a microcontroller web server. Very simple, even for web browser.

→ Responsive by nature - mobile compatible.

> 🚨 Vanilla CSS → ***Storybook*** to prototype components.

---

## User Actions
### Get Started: User action 1

Web UI — import NeoPixel type with scaled size to dot, fetch, adjust dependency, docs → pts

### Positioning Flow: User action 2

① Open canvas

<table>
<tr>
<td width="50%" valign="top">

#### To start

1. Select canvas dimensions (screenshot Motion)
2. Button: [ Start positioning ]
3. Click on canvas to position NeoPixel LEDs.
   1. NeoPixel LED: One point or circle on the canvas that can change colors.
4. Button: [ End positioning / finish arranging ]

</td>
<td width="50%" valign="top">

#### Options while feature is open for changes (dashboard)

1. Drag to move existing NeoPixel LEDs.

</td>
</tr>
</table>

### Start sequence / animations: user action 3

<table>
<tr>
<td width="50%" valign="top">

② Button: [ "Start Animation Pattern Sequence" ]

• Click on each NeoPixel LED. The order with which you click is what determines the order in which they
Button: [ "End Animation Pattern Sequence" ]

> 🚨 Have set model patterns too.
> Pull from Adafruit.

</td>
<td width="50%" valign="top">

#### Options while feature is open for changes (dashboard)

**Toggles:**
- Size
- Color
  > 🚨 ? Different colors between LEDs and very smooth hue transitions
- Brightness (select groups can have different brightness)
- Speed
- ms lenght of interval

V2:
- NeoPixel type (?) V2

</td>
</tr>
</table>

### Last step: Export Code / Library Function to be pasted and tested directly within

• Expert code or library function

### User actions always available (especially during editing animation)

③ "RUN" the play animation.
→ Auto save values each time. To browser cache?

### Exporting animation: Final step

**Goal:** Take this UI → expose to user via network == Access point.

③ Button: [ Process Arduino C++ code with AdafruitNeoPixel library ]
Button: [ Export Arduino code in full to test right away ]
Button: [ Copy components Arduino code in full to test right away ]
