### inputs:

- screenshot of reel / link to reel
- link to lip balm product they’re promoting

### get influencer reference image

- screenshot first frame of linked post
    - “Keep just the girl on the left, remove the girl on the right. Make the girl on the left’s skin look more normal, not smooth. Make her still recording in a similar position. Make her lips look very dry, like she needs lip balm.”
    - Thoughts: take an existing character, make sure the emphasize the parts of her that are needing the product

### make script

- feed screenshot and prompt into nano banana 2 9:16
- opens script writer tool, paste in reference video, uses it to analyze the script of the video
- prompts script write “I want a short video, about 4 lines, talking about the Dior Addict Lip Glow.”
- initial generated script
    1. If your lips always look dry and flaky even under gloss, it’s not you skin, it’s just what you’re putting on them.
    2. Most people use heavy lipsticks that settle into lines and make them look worse, but I switched to the Dior Addict Lip Glow because it reacts to your pH and actually hydrates.
    3. It melts right into the skip so it looks fresh and natural instead of looking like a thick layer of makeup.
    4. I get asked about this shade every time I wear it so I just put the link in my bio for you.
- edited script
    1. If your lips look dry and flaky it is not your skin its the products you’re using.
    2. This balm reacts to your skin’s pH to create a color that looks natural on you.
    3. It melts right in so your lips stay smooth and fresh all day without feeling greasy.
    4. It is the Dior Addict Lip Glow and it gives you a perfect tint without any patchy lines or dryness.
    5. Comment “lip” and I’ll send you my full routine.

### generate video

- first scene: **If your lips look dry and flaky it is not your skin its the products you’re using.**
    - take first line + original reference image and feed into kling 3.0 pro
    - make it so clips are cut to 5 or 10 seconds, and make sure audio button is on
- second scene: **This balm reacts to your skin’s pH to create a color that looks natural on you.**
    - get image of product + original influencer image and generate first frame of person holding product, same video generation
        - prompt: Make her holding the Dior addict lip glow now, still with dry flaky lips
    - Thoughts: If scene script references product, get an image of it and generate influencer with it
- third scene: **It melts right in so your lips stay smooth and fresh all day without feeling greasy.**
    - 2nd frame influencer image
        - prompt: Make it so she’s now applying the Lip Balm and her lips look great and a bit vibrant
- fourth scene: **It is the Dior Addict Lip Glow and it gives you a perfect tint without any patchy lines or dryness.**
    - 2nd frame influencer image, two prompts this time
        - prompt 1: Make her holding this product in another place in the store
        - prompt 2: Make it so she’s holding the product in her hand and recording it from a first person POV, like shes using the front camera on her iphone. So all you can see if her hand holding the product up close in the store.
        - prompt 2 iteration: Remove all the text at the top of the screen
- fifth scene: **Comment “lip” and I’ll send you my full routine.**
    - original influencer image, looking directly into camera

video prompt tip, estimate the time it takes to say the line, and then add “leave {clip len - estimated time} seconds of silence at the end” to the video prompt.